class UserEntity {
  final String userId;
  final String email;
  final String displayName;
  final String role;
  final String? phoneNumber;
  final String? profilePhotoUrl;
  final int points;

  const UserEntity({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.role,
    this.phoneNumber,
    this.profilePhotoUrl,
    this.points = 1420,
  });
}
