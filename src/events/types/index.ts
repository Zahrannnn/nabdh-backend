export class RequestCreatedEvent {
  constructor(
    public readonly requestId: string,
    public readonly patientId: string,
  ) {}
}

export class SosCreatedEvent {
  constructor(
    public readonly requestId: string,
    public readonly patientId: string,
    public readonly latitude: number,
    public readonly longitude: number,
  ) {}
}

export class OfferSubmittedEvent {
  constructor(
    public readonly offerId: string,
    public readonly requestId: string,
    public readonly nurseId: string,
  ) {}
}

export class OfferSelectedEvent {
  constructor(
    public readonly offerId: string,
    public readonly requestId: string,
    public readonly nurseId: string,
  ) {}
}

export class BookingStatusChangedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly status: string,
  ) {}
}

export class BookingCompletedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly nurseId: string,
    public readonly amount: number,
  ) {}
}

export class PaymentCompletedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly bookingId: string,
  ) {}
}

export class NurseVerifiedEvent {
  constructor(public readonly nurseId: string) {}
}
