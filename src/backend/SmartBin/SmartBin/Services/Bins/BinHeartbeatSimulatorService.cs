using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartBin.Context;
using SmartBin.Models.Constants;

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
                    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    var threshold = DateTime.UtcNow.Subtract(_offlineTimeout);

                    // Check bins with overdue heartbeats and update status to OFFLINE
                    var overdueBins = await context.SmartBins
                        .Where(b => b.Status != SmartBinStatus.Offline && b.LastHeartbeatAt.HasValue && b.LastHeartbeatAt < threshold)
                        .ToListAsync(stoppingToken);

                    if (overdueBins.Count > 0)
                    {
                        foreach (var bin in overdueBins)
                        {
                            bin.Status = SmartBinStatus.Offline;
                        }

                        await context.SaveChangesAsync(stoppingToken);
                        _logger.LogInformation("Marked {Count} bin(s) as OFFLINE due to heartbeat timeout.", overdueBins.Count);
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
