'use server';

import { prepareGymEnquiry, type SignupState } from '@/lib/gym-enquiry';
export type { SignupState } from '@/lib/gym-enquiry';
export async function checkIsFirstCustomer(): Promise<boolean> { return false; }
export async function signupOwner(_prev: SignupState, formData: FormData): Promise<SignupState> {
  return prepareGymEnquiry(formData);
}
