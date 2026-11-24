using System.Threading.Tasks;
using System.Threading;
using System;

namespace EcoBin.Api;

// Placeholders until Member 2 and Member 4 give us the real services.
// They throw on purpose so you notice if something is not wired yet.

public class WalletServiceStub : IWalletService
{
    public Task<int> GetAvailablePointsAsync(int userId, CancellationToken ct = default) => throw new NotImplementedException("Waiting for Member 2: IWalletService");
    public Task<WalletDebitResult> DebitForRedemptionAsync(int userId, int points, int voucherId, CancellationToken ct = default) => throw new NotImplementedException("Waiting for Member 2: IWalletService");
}

public class SessionPointsServiceStub : ISessionPointsService
{
    public Task<SessionFinalizationResult> FinalizeSessionPointsAsync(int sessionId, CancellationToken ct = default) => throw new NotImplementedException("Waiting for Member 2: ISessionPointsService");
}

public class RewardStockServiceStub : IRewardStockService
{
    public Task<bool> TryDecrementStockAsync(int rewardId, CancellationToken ct = default) => throw new NotImplementedException("Waiting for Member 4: IRewardStockService");
}
