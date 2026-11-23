import '../../../../core/utils/result.dart';
import '../../domain/entities/disposal_session_entity.dart';
import '../../domain/repositories/session_repository.dart';
import '../datasources/session_remote_data_source.dart';

class SessionRepositoryImpl implements SessionRepository {
  final SessionRemoteDataSource remoteDataSource;

  SessionRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<DisposalSessionEntity>> startSession({
    required String binId,
    required String qrPayload,
  }) async {
    try {
      final session = await remoteDataSource.startSession(binId, qrPayload);
      return Result.success(session);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<DisposalSessionEntity>> getSessionStatus(String sessionId) async {
    try {
      final session = await remoteDataSource.getSessionStatus(sessionId);
      return Result.success(session);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<DisposalSessionEntity>> endSession(String sessionId) async {
    try {
      final session = await remoteDataSource.endSession(sessionId);
      return Result.success(session);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }
}
