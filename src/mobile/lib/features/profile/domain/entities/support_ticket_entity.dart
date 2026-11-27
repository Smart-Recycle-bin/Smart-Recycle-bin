class SupportTicketEntity {
  final String ticketId;
  final String category;
  final String description;
  final String? sessionId;
  final String status;
  final DateTime createdAt;

  const SupportTicketEntity({
    required this.ticketId,
    required this.category,
    required this.description,
    this.sessionId,
    required this.status,
    required this.createdAt,
  });
}
