import { IsString, IsNotEmpty, IsDateString, IsNumber } from 'class-validator';

export class CreateNurseDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @IsDateString()
  licenseExpiryDate: string;

  @IsNumber()
  yearsOfExperience: number;

  @IsString()
  bio: string;

  @IsNumber()
  hourlyRate: number;
}
