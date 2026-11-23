import '../../../../core/utils/result.dart';
import '../entities/disposal_session_entity.dart';

abstract class SessionRepository {
  Future<Result<DisposalSessionEntity>> startSession({
    required String binId,
    required String qrPayload,
  });

  Future<Result<DisposalSessionEntity>> getSessionStatus(String sessionId);

  Future<Result<DisposalSessionEntity>> endSession(String sessionId);
}
