import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateLocationDto } from './update-location.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateLocationDto, payload);
  const errors = await validate(dto, { skipMissingProperties: false });

  return errors.map((e) => Object.keys(e.constraints ?? {})).flat();
}

describe('UpdateLocationDto — speed validation', () => {
  it('accepts a valid payload with speed', async () => {
    const errors = await validateDto({ latitude: 30.04, longitude: 31.23, speed: 40 });

    expect(errors).toHaveLength(0);
  });

  it('accepts a payload without speed (optional)', async () => {
    const errors = await validateDto({ latitude: 30.04, longitude: 31.23 });

    expect(errors).toHaveLength(0);
  });

  it('rejects negative speed', async () => {
    const errors = await validateDto({ latitude: 30.04, longitude: 31.23, speed: -1 });

    expect(errors).toContain('min');
  });

  it('rejects implausible speed (300+ km/h)', async () => {
    const errors = await validateDto({ latitude: 30.04, longitude: 31.23, speed: 9999 });

    expect(errors).toContain('max');
  });

  it('rejects non-numeric speed', async () => {
    const errors = await validateDto({ latitude: 30.04, longitude: 31.23, speed: 'fast' });

    expect(errors).toContain('isNumber');
  });

  it('still validates latitude/longitude bounds', async () => {
    const errors = await validateDto({ latitude: 999, longitude: -9999 });

    expect(errors).toContain('max');
  });
});
