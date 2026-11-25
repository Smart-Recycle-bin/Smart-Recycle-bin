using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartBin.Repositories.Bins;

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

                    var threshold = DateTime.UtcNow.Subtract(_offlineTimeout);

                    int count = await binRepository.MarkOverdueBinsOfflineAsync(threshold, stoppingToken);

                    if (count > 0)
                    {
                        _logger.LogInformation("Marked {Count} bin(s) as OFFLINE due to heartbeat timeout.", count);
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
