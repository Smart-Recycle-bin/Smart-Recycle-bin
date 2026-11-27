namespace SmartBin.DTOs.Notifications
{
    public class AdminNotificationItemDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Message { get; set; }
        public DateTime Time { get; set; }
        public bool Unread { get; set; }
        public string Type { get; set; } = "info";
        public string SourceType { get; set; } = string.Empty;
        public string? SourceReferenceId { get; set; }
    }

    public class AdminNotificationsFeedDto
    {
        public List<AdminNotificationItemDto> Items { get; set; } = new();
        public int UnreadCount { get; set; }
    }

    public class MarkNotificationReadResponseDto
    {
        public int Id { get; set; }
        public bool Unread { get; set; }
    }

    public class MarkAllNotificationsReadResponseDto
    {
        public int UnreadCount { get; set; }
    }
}
