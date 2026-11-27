namespace SmartBin.DTOs.Audit
{
    public class AdminAuditLogItemDto
    {
        public int AuditId { get; set; }
        public DateTime Timestamp { get; set; }
        public int AdminId { get; set; }
        public string AdminName { get; set; } = string.Empty;
        public string AdminInitials { get; set; } = string.Empty;
        public string ActionType { get; set; } = string.Empty;
        public string ResourceType { get; set; } = string.Empty;
        public string ResourceId { get; set; } = string.Empty;
        public string Justification { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
    }
}
