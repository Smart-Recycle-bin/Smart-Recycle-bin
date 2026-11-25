namespace SmartBin.Services.Sessions
{
    public class SessionTimeoutBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SessionTimeoutBackgroundService> _logger;
        private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(5);

        public SessionTimeoutBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<SessionTimeoutBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Session Timeout Background Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var sessionService = scope.ServiceProvider.GetRequiredService<ISessionService>();
                    var expiredCount = await sessionService.ProcessExpiredSessionsAsync(stoppingToken);

                    if (expiredCount > 0)
                    {
                        _logger.LogInformation("Expired {Count} disposal session(s).", expiredCount);
                    }
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "Error in Session Timeout Background Service.");
                }

                await Task.Delay(_pollInterval, stoppingToken);
            }
        }
    }
}
