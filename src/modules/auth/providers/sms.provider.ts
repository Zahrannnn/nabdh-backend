export abstract class SmsProvider {
  abstract sendSms(phone: string, message: string): Promise<void>;
}
