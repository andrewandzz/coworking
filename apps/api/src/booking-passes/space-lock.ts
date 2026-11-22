import type { QueryRunner } from 'typeorm';

export async function tryLockBookingSpace(transaction: Pick<QueryRunner, 'sql'>, spaceId: string): Promise<boolean> {
  const [lock] = await transaction.sql<{ status: number }[]>`
    DECLARE @status int;
    EXEC @status = sys.sp_getapplock
      @Resource = ${`coworking:space:${spaceId}`}, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000;
    SELECT @status AS status;
  `;
  return lock !== undefined && lock.status >= 0;
}
