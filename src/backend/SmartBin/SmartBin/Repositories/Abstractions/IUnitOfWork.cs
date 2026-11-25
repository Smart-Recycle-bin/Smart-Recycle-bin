namespace SmartBin.Repositories.Abstractions
{
    public interface IUnitOfWork : IAsyncDisposable, IDisposable
    {
        bool HasActiveTransaction { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
        Task BeginTransactionAsync(CancellationToken cancellationToken = default);
        Task CommitTransactionAsync(CancellationToken cancellationToken = default);
        Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
    }
}
