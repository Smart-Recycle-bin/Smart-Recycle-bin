import '../../domain/entities/support_ticket_entity.dart';

class SupportTicketModel extends SupportTicketEntity {
  const SupportTicketModel({
    required super.ticketId,
    required super.category,
    required super.description,
    super.sessionId,
    required super.status,
    required super.createdAt,
  });

  factory SupportTicketModel.fromJson(Map<String, dynamic> json) {
    return SupportTicketModel(
      ticketId: (json['ticketId'] ?? '').toString(),
      category: (json['category'] ?? 'general_inquiry').toString(),
      description: (json['description'] ?? '').toString(),
      sessionId: json['sessionId']?.toString(),
      status: (json['status'] ?? 'open').toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now().toUtc(),
    );
  }
}
