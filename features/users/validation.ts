import { z } from "zod"

// Zod schema for staff creation form data: name, email, password (min 8 chars).
export const StaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type StaffFormData = z.infer<typeof StaffSchema>

export type StaffFieldErrors = Partial<Record<keyof StaffFormData, string>>
