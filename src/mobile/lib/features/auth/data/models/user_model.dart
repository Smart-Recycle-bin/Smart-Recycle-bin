import '../../domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.userId,
    required super.email,
    required super.displayName,
    required super.role,
    super.phoneNumber,
    super.profilePhotoUrl,
    super.points,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      userId: json['userId'] ?? json['id'] ?? '',
      email: json['email'] ?? '',
      displayName: json['displayName'] ?? json['fullName'] ?? 'User',
      role: json['role'] ?? 'USER_CITIZEN',
      phoneNumber: json['phoneNumber'],
      profilePhotoUrl: json['profilePhotoUrl'],
      points: json['points'] ?? 1420,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'email': email,
      'displayName': displayName,
      'role': role,
      'phoneNumber': phoneNumber,
      'profilePhotoUrl': profilePhotoUrl,
      'points': points,
    };
  }
}
