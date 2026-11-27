using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.ML;
using Microsoft.ML.Data;
using SixLabors.ImageSharp;
using SmartBin.Models.Constants;

namespace SmartBin.Services.Bins
{
    public class ClassificationResult
    {
        public string WasteType { get; set; } = string.Empty;
        public string PredictedLabel { get; set; } = string.Empty;
        public int Angle { get; set; }
        public decimal ConfidenceScore { get; set; }
    }

    public static class WasteClassificationMapping
    {
        public static string ToWasteType(string label) =>
            label.Trim().ToLowerInvariant() switch
            {
                "biological" or "organic" => WasteTypeNames.Organic,
                "metal" => WasteTypeNames.Metal,
                "paper" => WasteTypeNames.Paper,
                "plastic" => WasteTypeNames.Plastic,
                "trash" or "general" => WasteTypeNames.Trash,
                _ => label.Trim().ToUpperInvariant()
            };

        public static string ToModelLabel(string wasteTypeOrLabel) =>
            wasteTypeOrLabel.Trim().ToLowerInvariant() switch
            {
                "organic" or "biological" => "biological",
                "metal" => "metal",
                "paper" => "paper",
                "plastic" => "plastic",
                _ => "trash"
            };

        // Bin slot order matching firmware: paper=0, metal=72, biological/organic=144, plastic=216, trash=288
        public static int ToBinAngle(string labelOrWasteType) =>
            labelOrWasteType.Trim().ToLowerInvariant() switch
            {
                "paper" => 0,
                "metal" => 72,
                "biological" or "organic" => 144,
                "plastic" => 216,
                "trash" or "general" => 288,
                _ => 288
            };
    }

    public interface IClassificationAdapter
    {
        Task<ClassificationResult> ClassifyImageAsync(IFormFile image, Stream stream);
    }

    /// <summary>
    /// Runs in-process inference against the trained ML.NET image classification model (MLModel.mlnet).
    /// </summary>
    public sealed class MlNetClassificationAdapter : IClassificationAdapter
    {
        private sealed class ModelInput
        {
            [LoadColumn(0)]
            public VBuffer<byte> ImageSource { get; set; }

            [LoadColumn(1)]
            public string Label { get; set; } = string.Empty;
        }

        private readonly string? _configuredPath;
        private readonly ILogger<MlNetClassificationAdapter> _logger;
        private readonly object _syncLock = new();
        private string[] _labels = new[] { "biological", "metal", "paper", "plastic", "trash" };
        private MLContext? _mlContext;
        private ITransformer? _model;

        public MlNetClassificationAdapter(
            IConfiguration configuration,
            ILogger<MlNetClassificationAdapter> logger)
        {
            _configuredPath = configuration["MLModel:ModelPath"];
            _logger = logger;
        }

        public async Task<ClassificationResult> ClassifyImageAsync(IFormFile image, Stream stream)
        {
            using var ms = new MemoryStream();
            if (stream.CanSeek)
            {
                stream.Position = 0;
            }
            await stream.CopyToAsync(ms);
            var bytes = ms.ToArray();

            if (bytes.Length == 0)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Image payload is empty.");
            }

            try
            {
                using var checkStream = new MemoryStream(bytes, writable: false);
                var info = await Image.IdentifyAsync(checkStream);
                if (info == null)
                {
                    throw new ApiException(400, "CLASSIFICATION_FAILED", "Invalid image format.");
                }
            }
            catch (ApiException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new ApiException(400, "CLASSIFICATION_FAILED", $"Unreadable image payload: {ex.Message}");
            }

            lock (_syncLock)
            {
                EnsureModelLoadedLocked();

                var input = new ModelInput
                {
                    ImageSource = new VBuffer<byte>(bytes.Length, bytes),
                    Label = "trash"
                };

                var data = _mlContext!.Data.LoadFromEnumerable(new[] { input });
                var transformed = _model!.Transform(data);
                var scores = transformed.GetColumn<float[]>("Score").FirstOrDefault();
                var rawPredicted = transformed.GetColumn<string>("PredictedLabel").FirstOrDefault();

                string topLabel = string.IsNullOrWhiteSpace(rawPredicted) ? "trash" : rawPredicted.Trim().ToLowerInvariant();
                float topScore = 0f;

                if (scores != null && scores.Length > 0)
                {
                    var ranked = _labels
                        .Select((label, index) => (Label: label, Score: index < scores.Length ? scores[index] : 0f))
                        .OrderByDescending(x => x.Score)
                        .First();

                    topLabel = ranked.Label;
                    topScore = ranked.Score;
                }

                var wasteType = WasteClassificationMapping.ToWasteType(topLabel);
                return new ClassificationResult
                {
                    WasteType = wasteType,
                    PredictedLabel = WasteClassificationMapping.ToModelLabel(topLabel),
                    Angle = WasteClassificationMapping.ToBinAngle(topLabel),
                    ConfidenceScore = Math.Round((decimal)Math.Clamp(topScore, 0f, 1f), 4)
                };
            }
        }

        private void EnsureModelLoadedLocked()
        {
            if (_model != null && _mlContext != null)
            {
                return;
            }

            var modelPath = LocateModelPath();
            var labelsCandidates = new[]
            {
                Path.Combine(Path.GetDirectoryName(modelPath) ?? AppContext.BaseDirectory, "labels.json"),
                Path.Combine(AppContext.BaseDirectory, "AI", "labels.json"),
                Path.Combine(AppContext.BaseDirectory, "labels.json")
            };

            foreach (var labelsPath in labelsCandidates)
            {
                if (File.Exists(labelsPath))
                {
                    var parsed = JsonSerializer.Deserialize<string[]>(File.ReadAllText(labelsPath));
                    if (parsed is { Length: > 0 })
                    {
                        _labels = parsed;
                        break;
                    }
                }
            }

            Environment.SetEnvironmentVariable("TF_CPP_MIN_LOG_LEVEL", "3");
            _mlContext = new MLContext(seed: 1);
            _model = _mlContext.Model.Load(modelPath, out _);
            _logger.LogInformation("Loaded ML.NET model from {ModelPath} with labels [{Labels}].", modelPath, string.Join(",", _labels));
        }

        private string LocateModelPath()
        {
            var candidates = new List<string>();
            if (!string.IsNullOrWhiteSpace(_configuredPath))
            {
                candidates.Add(Path.IsPathRooted(_configuredPath)
                    ? _configuredPath
                    : Path.Combine(AppContext.BaseDirectory, _configuredPath));
                candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), _configuredPath));
            }

            candidates.Add(Path.Combine(AppContext.BaseDirectory, "AI", "MLModel.mlnet"));
            candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), "AI", "MLModel.mlnet"));
            candidates.Add(Path.Combine(AppContext.BaseDirectory, "MLModel.mlnet"));

            foreach (var candidate in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (File.Exists(candidate))
                {
                    return candidate;
                }
            }

            throw new ApiException(500, "AI_MODEL_MISSING", "MLModel.mlnet could not be located on the server.");
        }
    }

    public class ClassificationAdapter : IClassificationAdapter
    {
        public Task<ClassificationResult> ClassifyImageAsync(IFormFile image, Stream stream)
        {
            var fileName = image.FileName.ToLowerInvariant();

            string wasteType;
            decimal confidence;

            if (fileName.Contains("metal") || fileName.Contains("can"))
            {
                wasteType = WasteTypeNames.Metal;
                confidence = 0.96m;
            }
            else if (fileName.Contains("paper") || fileName.Contains("cardboard"))
            {
                wasteType = WasteTypeNames.Paper;
                confidence = 0.92m;
            }
            else if (fileName.Contains("organic") || fileName.Contains("food") || fileName.Contains("bio"))
            {
                wasteType = WasteTypeNames.Organic;
                confidence = 0.90m;
            }
            else if (fileName.Contains("trash") || fileName.Contains("waste"))
            {
                wasteType = WasteTypeNames.Trash;
                confidence = 0.88m;
            }
            else
            {
                wasteType = WasteTypeNames.Plastic;
                confidence = 0.94m;
            }

            return Task.FromResult(new ClassificationResult
            {
                WasteType = wasteType,
                PredictedLabel = WasteClassificationMapping.ToModelLabel(wasteType),
                Angle = WasteClassificationMapping.ToBinAngle(wasteType),
                ConfidenceScore = confidence
            });
        }
    }
}
