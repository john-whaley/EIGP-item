import { Prisma } from '@prisma/client';

export const primaryEmailInclude = Prisma.validator<Prisma.PrimaryEmailInclude>()({
  platformLinks: {
    include: {
      platform: true
    }
  },
  recoveryEmailLinks: {
    include: {
      recoveryEmail: true
    }
  },
  registerPhoneLinks: {
    include: {
      registerPhone: true
    }
  },
  recoveryPhoneLinks: {
    include: {
      recoveryPhone: true
    }
  }
});

export const recoveryEmailInclude = Prisma.validator<Prisma.RecoveryEmailInclude>()({
  emailLinks: {
    include: {
      email: true
    }
  }
});

export const registerPhoneInclude = Prisma.validator<Prisma.RegisterPhoneInclude>()({
  emailLinks: {
    include: {
      email: true
    }
  }
});

export const recoveryPhoneInclude = Prisma.validator<Prisma.RecoveryPhoneInclude>()({
  emailLinks: {
    include: {
      email: true
    }
  }
});

export const platformInclude = Prisma.validator<Prisma.PlatformInclude>()({
  emailLinks: {
    include: {
      email: true
    }
  }
});

export type PrimaryEmailRecord = Prisma.PrimaryEmailGetPayload<{
  include: typeof primaryEmailInclude;
}>;

export type RecoveryEmailRecord = Prisma.RecoveryEmailGetPayload<{
  include: typeof recoveryEmailInclude;
}>;

export type RegisterPhoneRecord = Prisma.RegisterPhoneGetPayload<{
  include: typeof registerPhoneInclude;
}>;

export type RecoveryPhoneRecord = Prisma.RecoveryPhoneGetPayload<{
  include: typeof recoveryPhoneInclude;
}>;

export type PlatformRecord = Prisma.PlatformGetPayload<{
  include: typeof platformInclude;
}>;
