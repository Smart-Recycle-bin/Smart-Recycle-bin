using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Wallet;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Wallet
{
    public class AdminLedgerRepository : IAdminLedgerRepository
    {
        private readonly AppDbContext _context;
        private readonly IWalletRepository _walletRepository;

        public AdminLedgerRepository(AppDbContext context, IWalletRepository walletRepository)
        {
            _context = context;
            _walletRepository = walletRepository;
        }

        public async Task<(List<AdminLedgerRowDto> Items, int TotalItems)> GetAdminLedgerPagedAsync(
            int? userId,
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive,
            string? entryType,
            string? source,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var query = _context.LedgerTransactions
                .AsNoTracking()
                .Where(lt => lt.Wallet != null)
                .AsQueryable();

            if (userId.HasValue)
            {
                var targetId = userId.Value;
                query = query.Where(lt => lt.Wallet!.UserId == targetId);
            }

            if (fromUtc.HasValue)
            {
                var start = fromUtc.Value;
                query = query.Where(lt => lt.CreatedAt >= start);
            }

            if (toBoundUtc.HasValue)
            {
                var end = toBoundUtc.Value;
                query = toExclusive
                    ? query.Where(lt => lt.CreatedAt < end)
                    : query.Where(lt => lt.CreatedAt <= end);
            }

            if (!string.IsNullOrWhiteSpace(entryType))
            {
                var normalizedType = entryType.Trim().ToLowerInvariant();
                if (normalizedType == LedgerTransactionType.Credit)
                {
                    query = query.Where(lt => lt.TransactionType == LedgerTransactionType.Credit || lt.PointsDelta > 0);
                }
                else if (normalizedType == LedgerTransactionType.Debit)
                {
                    query = query.Where(lt => lt.TransactionType == LedgerTransactionType.Debit || lt.PointsDelta < 0);
                }
            }

            if (!string.IsNullOrWhiteSpace(source))
            {
                var normalizedSource = source.Trim().ToLowerInvariant();
                if (normalizedSource == "session_confirm" || normalizedSource == LedgerSource.SessionAward)
                {
                    query = query.Where(lt => lt.Source == "session_confirm" || lt.Source == LedgerSource.SessionAward);
                }
                else if (normalizedSource == LedgerSource.VoucherRedemption || normalizedSource == "reward_redemption")
                {
                    query = query.Where(lt => lt.Source == LedgerSource.VoucherRedemption || lt.Source == "reward_redemption");
                }
                else
                {
                    query = query.Where(lt => lt.Source == normalizedSource);
                }
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var hasNumericId = int.TryParse(s, out var parsedId);

                query = query.Where(lt =>
                    (hasNumericId && (lt.TransactionId == parsedId ||
                                      lt.Wallet!.UserId == parsedId ||
                                      (lt.Session != null && lt.Session.BinId == parsedId))) ||
                    (lt.Wallet!.User != null && (
                        lt.Wallet.User.DisplayName.Contains(s) ||
                        (lt.Wallet.User.Email != null && lt.Wallet.User.Email.Contains(s)))) ||
                    (lt.Session != null && lt.Session.Bin != null && (
                        (lt.Session.Bin.Name != null && lt.Session.Bin.Name.Contains(s)) ||
                        lt.Session.Bin.SerialNumber.Contains(s))) ||
                    (lt.ReasonCode != null && lt.ReasonCode.Contains(s)) ||
                    (lt.ReasonNote != null && lt.ReasonNote.Contains(s)) ||
                    lt.Source.Contains(s));
            }

            var totalItems = await query.CountAsync(cancellationToken);

            var projected = query.Select(lt => new
            {
                lt.TransactionId,
                lt.CreatedAt,
                UserId = lt.Wallet!.UserId,
                UserName = lt.Wallet.User != null
                    ? (!string.IsNullOrWhiteSpace(lt.Wallet.User.DisplayName)
                        ? lt.Wallet.User.DisplayName
                        : (lt.Wallet.User.Email ?? $"Citizen #{lt.Wallet.UserId}"))
                    : $"Citizen #{lt.Wallet.UserId}",
                lt.SessionId,
                lt.VoucherId,
                BinId = lt.Session != null ? (int?)lt.Session.BinId : null,
                BinName = lt.Session != null && lt.Session.Bin != null ? lt.Session.Bin.Name : null,
                lt.PointsDelta,
                lt.RunningBalance,
                EntryType = lt.PointsDelta < 0 || lt.TransactionType == LedgerTransactionType.Debit
                    ? LedgerTransactionType.Debit
                    : LedgerTransactionType.Credit,
                lt.Source,
                lt.ReasonCode,
                lt.ReasonNote
            });

            bool isDesc = string.Equals(sortDir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

            var orderedQuery = normalizedSortBy switch
            {
                "transactionid" => isDesc
                    ? projected.OrderByDescending(x => x.TransactionId)
                    : projected.OrderBy(x => x.TransactionId),
                "username" => isDesc
                    ? projected.OrderByDescending(x => x.UserName).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.TransactionId)
                    : projected.OrderBy(x => x.UserName).ThenBy(x => x.CreatedAt).ThenBy(x => x.TransactionId),
                "pointsdelta" => isDesc
                    ? projected.OrderByDescending(x => x.PointsDelta).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.TransactionId)
                    : projected.OrderBy(x => x.PointsDelta).ThenBy(x => x.CreatedAt).ThenBy(x => x.TransactionId),
                "runningbalance" => isDesc
                    ? projected.OrderByDescending(x => x.RunningBalance).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.TransactionId)
                    : projected.OrderBy(x => x.RunningBalance).ThenBy(x => x.CreatedAt).ThenBy(x => x.TransactionId),
                "source" => isDesc
                    ? projected.OrderByDescending(x => x.Source).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.TransactionId)
                    : projected.OrderBy(x => x.Source).ThenBy(x => x.CreatedAt).ThenBy(x => x.TransactionId),
                "entrytype" or "type" => isDesc
                    ? projected.OrderByDescending(x => x.EntryType).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.TransactionId)
                    : projected.OrderBy(x => x.EntryType).ThenBy(x => x.CreatedAt).ThenBy(x => x.TransactionId),
                "timestamp" or "createdat" => isDesc
                    ? projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.TransactionId)
                    : projected.OrderBy(x => x.CreatedAt).ThenBy(x => x.TransactionId),
                _ => projected.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.TransactionId)
            };

            var rows = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var sessionIds = rows
                .Where(r => r.SessionId.HasValue)
                .Select(r => r.SessionId!.Value)
                .Distinct()
                .ToList();

            var itemsSummaryBySession = new Dictionary<int, string>();
            if (sessionIds.Count > 0)
            {
                var sessionItems = await _context.DisposalItems
                    .AsNoTracking()
                    .Where(di => sessionIds.Contains(di.SessionId))
                    .Select(di => new
                    {
                        di.SessionId,
                        WasteTypeName = di.WasteType != null ? di.WasteType.Name : "Unknown"
                    })
                    .ToListAsync(cancellationToken);

                itemsSummaryBySession = sessionItems
                    .GroupBy(x => x.SessionId)
                    .ToDictionary(
                        g => g.Key,
                        g => string.Join(", ", g
                            .GroupBy(i => i.WasteTypeName)
                            .OrderByDescending(wg => wg.Count())
                            .ThenBy(wg => wg.Key, StringComparer.OrdinalIgnoreCase)
                            .Select(wg => $"{wg.Count()}× {wg.Key}")));
            }

            var items = rows.Select(r =>
            {
                var normalizedSource = NormalizeContractSource(r.Source);
                var isManual = string.Equals(normalizedSource, LedgerSource.ManualAdjustment, StringComparison.OrdinalIgnoreCase);

                string detailText;
                if (isManual)
                {
                    if (!string.IsNullOrWhiteSpace(r.ReasonCode) && !string.IsNullOrWhiteSpace(r.ReasonNote))
                    {
                        detailText = $"{r.ReasonCode}: {r.ReasonNote}";
                    }
                    else
                    {
                        detailText = !string.IsNullOrWhiteSpace(r.ReasonNote)
                            ? r.ReasonNote!
                            : (r.ReasonCode ?? "Manual adjustment");
                    }
                }
                else if (r.SessionId.HasValue)
                {
                    if (itemsSummaryBySession.TryGetValue(r.SessionId.Value, out var summaryText) &&
                        !string.IsNullOrWhiteSpace(summaryText))
                    {
                        detailText = $"{summaryText} ({Math.Abs(r.PointsDelta)} pts)";
                    }
                    else
                    {
                        detailText = $"Disposal session #{r.SessionId.Value} ({Math.Abs(r.PointsDelta)} pts)";
                    }
                }
                else if (normalizedSource == LedgerSource.VoucherRedemption)
                {
                    detailText = r.VoucherId.HasValue
                        ? $"Voucher redemption (#{r.VoucherId.Value})"
                        : $"Reward redemption ({Math.Abs(r.PointsDelta)} pts)";
                }
                else
                {
                    detailText = $"Disposal credit ({Math.Abs(r.PointsDelta)} pts)";
                }

                string? resolvedBinName = r.BinId.HasValue
                    ? (!string.IsNullOrWhiteSpace(r.BinName) ? r.BinName : $"Bin#{r.BinId.Value:D3}")
                    : null;

                return new AdminLedgerRowDto
                {
                    TransactionId = r.TransactionId,
                    Timestamp = EnsureUtc(r.CreatedAt),
                    UserId = r.UserId,
                    UserName = r.UserName,
                    BinId = r.BinId,
                    BinName = resolvedBinName,
                    DetailText = detailText,
                    PointsDelta = r.PointsDelta,
                    RunningBalance = r.RunningBalance,
                    EntryType = r.EntryType,
                    Source = normalizedSource,
                    IsManualAdjustment = isManual,
                    ReasonCode = r.ReasonCode,
                    ReasonNote = r.ReasonNote
                };
            }).ToList();

            return (items, totalItems);
        }

        public Task<bool> UserExistsAsync(int userId, CancellationToken cancellationToken = default)
        {
            return _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == userId, cancellationToken);
        }

        public async Task<LedgerAdjustmentIdempotencyRecord?> GetIdempotencyRecordAsync(
            string idempotencyKey,
            CancellationToken cancellationToken = default)
        {
            var row = await _context.LedgerAdjustmentIdempotencies
                .AsNoTracking()
                .Where(x => x.IdempotencyKey == idempotencyKey)
                .Select(x => new
                {
                    x.IdempotencyKey,
                    x.RequestHash,
                    x.TransactionId,
                    TargetUserId = x.Transaction != null && x.Transaction.Wallet != null ? x.Transaction.Wallet.UserId : 0,
                    PointsDelta = x.Transaction != null ? x.Transaction.PointsDelta : 0,
                    RunningBalance = x.Transaction != null ? x.Transaction.RunningBalance : 0
                })
                .FirstOrDefaultAsync(cancellationToken);

            return row == null
                ? null
                : new LedgerAdjustmentIdempotencyRecord
                {
                    IdempotencyKey = row.IdempotencyKey,
                    RequestHash = row.RequestHash,
                    TransactionId = row.TransactionId,
                    TargetUserId = row.TargetUserId,
                    PointsDelta = row.PointsDelta,
                    RunningBalance = row.RunningBalance
                };
        }

        public async Task<ManualAdjustmentResponseDto> ExecuteAdjustmentAtomicAsync(
            int targetUserId,
            int amount,
            string entryType,
            string reasonCode,
            string reasonNote,
            int actorAdminId,
            string idempotencyKey,
            string requestHash,
            DateTime timestampUtc,
            CancellationToken cancellationToken = default)
        {
            bool isDebit = string.Equals(entryType, LedgerTransactionType.Debit, StringComparison.OrdinalIgnoreCase);
            int walletId;
            int balanceAfter;

            if (isDebit)
            {
                var wallet = await _walletRepository.GetByUserIdAsync(targetUserId, cancellationToken);
                if (wallet == null)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "INSUFFICIENT_BALANCE",
                        "User has insufficient available points for this debit adjustment.");
                }

                walletId = wallet.WalletId;
                var debited = await _walletRepository.TryDebitPointsAsync(walletId, amount, cancellationToken);
                if (!debited)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "INSUFFICIENT_BALANCE",
                        "User has insufficient available points for this debit adjustment.");
                }

                // Debit reduces AvailablePoints only; LifetimeEarnedPoints preserves historical earned points.
                balanceAfter = await _walletRepository.GetWalletAvailablePointsByIdAsync(walletId, cancellationToken);
            }
            else
            {
                var wallet = await _walletRepository.EnsureWalletExistsAsync(targetUserId, cancellationToken);
                walletId = wallet.WalletId;
                var (newAvailable, _) = await _walletRepository.CreditPointsAsync(walletId, amount, cancellationToken);
                balanceAfter = newAvailable;
            }

            int pointsDelta = isDebit ? -amount : amount;

            var transaction = new LedgerTransaction
            {
                WalletId = walletId,
                SessionId = null,
                VoucherId = null,
                TransactionType = isDebit ? LedgerTransactionType.Debit : LedgerTransactionType.Credit,
                PointsDelta = pointsDelta,
                RunningBalance = balanceAfter,
                Source = LedgerSource.ManualAdjustment,
                CreatedByAdminId = actorAdminId,
                ReasonCode = reasonCode,
                ReasonNote = reasonNote,
                CreatedAt = timestampUtc
            };

            await _context.LedgerTransactions.AddAsync(transaction, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            var idempotencyRecord = new LedgerAdjustmentIdempotency
            {
                IdempotencyKey = idempotencyKey,
                RequestHash = requestHash,
                AdminUserId = actorAdminId,
                TransactionId = transaction.TransactionId,
                CreatedAt = timestampUtc
            };

            await _context.LedgerAdjustmentIdempotencies.AddAsync(idempotencyRecord, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return new ManualAdjustmentResponseDto
            {
                TransactionId = transaction.TransactionId,
                UserId = targetUserId,
                PointsDelta = pointsDelta,
                BalanceAfter = balanceAfter
            };
        }

        private static string NormalizeContractSource(string rawSource)
        {
            if (string.Equals(rawSource, LedgerSource.SessionAward, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(rawSource, "session_confirm", StringComparison.OrdinalIgnoreCase))
            {
                return "session_confirm";
            }

            if (string.Equals(rawSource, "reward_redemption", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(rawSource, LedgerSource.VoucherRedemption, StringComparison.OrdinalIgnoreCase))
            {
                return LedgerSource.VoucherRedemption;
            }

            return rawSource;
        }

        private static DateTime EnsureUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
        }
    }
}
