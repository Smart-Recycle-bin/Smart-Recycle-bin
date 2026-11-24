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
      userId: json['userId']?.toString() ?? json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? json['fullName']?.toString() ?? 'User',
      role: json['role']?.toString() ?? 'USER_CITIZEN',
      phoneNumber: json['phoneNumber']?.toString(),
      profilePhotoUrl: json['profilePhotoUrl']?.toString(),
      points: (json['points'] as num?)?.toInt() ?? 0,
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
