using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartBin.Models.Constants;
using SmartBin.Repositories.Abstractions;
using SmartBin.Repositories.Bins;
using SmartBin.Services.Notifications;

namespace SmartBin.Services.Bins
{
    public class BinHeartbeatSimulatorService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BinHeartbeatSimulatorService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(30);
        private readonly TimeSpan _offlineTimeout = TimeSpan.FromMinutes(5);

        public BinHeartbeatSimulatorService(
            IServiceProvider serviceProvider,
            ILogger<BinHeartbeatSimulatorService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Bin Heartbeat Simulator Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var binRepository = scope.ServiceProvider.GetRequiredService<IBinRepository>();
                    var notificationService = scope.ServiceProvider.GetRequiredService<IAdminNotificationService>();
                    var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                    var threshold = DateTime.UtcNow.Subtract(_offlineTimeout);

                    await unitOfWork.BeginTransactionAsync(stoppingToken);
                    List<(int BinId, string? Name, string? District)> transitionedBins;
                    try
                    {
                        transitionedBins = await binRepository.MarkOverdueBinsOfflineWithDetailsAsync(threshold, stoppingToken);

                        foreach (var bin in transitionedBins)
                        {
                            var binLabel = !string.IsNullOrWhiteSpace(bin.Name)
                                ? bin.Name
                                : $"Bin#{bin.BinId:D3}";
                            var districtText = !string.IsNullOrWhiteSpace(bin.District)
                                ? $" ({bin.District})"
                                : string.Empty;

                            await notificationService.PublishToAdminsAsync(
                                $"Bin #{bin.BinId} offline",
                                $"{binLabel}{districtText} stopped responding to heartbeat pings and transitioned to OFFLINE.",
                                AdminNotificationTypes.Danger,
                                AdminNotificationSources.BinOffline,
                                bin.BinId.ToString(CultureInfo.InvariantCulture),
                                stoppingToken);
                        }

                        await unitOfWork.CommitTransactionAsync(stoppingToken);
                    }
                    catch
                    {
                        await unitOfWork.RollbackTransactionAsync(stoppingToken);
                        throw;
                    }

                    if (transitionedBins.Count > 0)
                    {
                        _logger.LogInformation("Marked {Count} bin(s) as OFFLINE due to heartbeat timeout.", transitionedBins.Count);
                    }
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "Error in Bin Heartbeat Simulator.");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }
        }
    }
}
