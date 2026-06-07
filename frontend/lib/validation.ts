export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/
export const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,50}$/
export const AMAZON_URL_REGEX =
  /^https?:\/\/(?:www\.)?amazon\.(?:com|es|co\.uk|de|fr|it|com\.mx|ca)\/.*(?:dp|gp\/product|product-reviews)\/[A-Z0-9]{10}/i

export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png']
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const ALLOWED_REVIEW_COUNTS = [10, 25, 50] as const

export function parseApiError(data: { detail?: unknown; message?: string }): string {
  const detail = data.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join(', ')
  }
  return data.message || 'Ocurrió un error inesperado.'
}

export function validateEmail(email: string): string | null {
  const value = email.trim().toLowerCase()
  if (!value) return 'El correo electrónico es obligatorio.'
  if (value.length > 254) return 'El correo es demasiado largo.'
  if (!EMAIL_REGEX.test(value)) return 'Ingresa un correo electrónico válido.'
  return null
}

export function validateLogin(username: string, password: string): string | null {
  if (!username.trim()) return 'El usuario es obligatorio.'
  if (username.trim().length > 100) return 'El usuario es demasiado largo.'
  if (!password) return 'La contraseña es obligatoria.'
  if (password.length > 128) return 'La contraseña es demasiado larga.'
  return null
}

export function validatePasswordReset(
  newPassword: string,
  confirmPassword: string
): string | null {
  if (!newPassword.trim()) return 'La nueva contraseña es obligatoria.'
  if (newPassword.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (newPassword.length > 128) return 'La contraseña no puede superar 128 caracteres.'
  if (!confirmPassword.trim()) return 'Debes confirmar la contraseña.'
  if (newPassword !== confirmPassword) return 'Las contraseñas no coinciden.'
  return null
}

export function validateUsername(username: string): string | null {
  const value = username.trim()
  if (!value) return 'El nombre de usuario es obligatorio.'
  if (!USERNAME_REGEX.test(value)) {
    return 'El usuario debe tener 3-50 caracteres (letras, números, . _ -).'
  }
  return null
}

export function validateName(
  name: string,
  label: string,
  required = false
): string | null {
  const value = name.trim()
  if (!value) {
    return required ? `El ${label} es obligatorio.` : null
  }
  if (!NAME_REGEX.test(value)) {
    return `El ${label} solo puede contener letras.`
  }
  if (value.length > 60) return `El ${label} es demasiado largo.`
  return null
}

export function validateCedula(cedula: string): string | null {
  const value = cedula.trim()
  if (!value) return 'La cédula de identidad es obligatoria.'
  if (!/^\d+$/.test(value)) return 'La cédula solo puede contener números.'
  if (value.length < 7 || value.length > 9) {
    return 'La cédula debe tener entre 7 y 9 dígitos.'
  }
  return null
}

export function validatePhone(phone: string): string | null {
  const value = phone.trim()
  if (!value) return 'El teléfono es obligatorio.'
  if (!/^\d{11}$/.test(value)) return 'El teléfono debe tener exactamente 11 dígitos.'
  return null
}

export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return 'Solo se permiten imágenes JPG o PNG (máx. 5 MB).'
  }
  if (file.size > MAX_PHOTO_BYTES) return 'La imagen no puede superar 5 MB.'
  return null
}

export function validateAmazonUrl(url: string): string | null {
  const value = url.trim()
  if (!value) return 'La URL del producto es obligatoria.'
  if (value.length > 2048) return 'La URL es demasiado larga.'
  try {
    new URL(value)
  } catch {
    return 'Ingresa una URL válida.'
  }
  if (!AMAZON_URL_REGEX.test(value)) {
    return 'Ingresa una URL válida de Amazon con el ASIN del producto.'
  }
  return null
}

export function validateReviewCount(value: string | number): string | null {
  const num = Number(value)
  if (!ALLOWED_REVIEW_COUNTS.includes(num as (typeof ALLOWED_REVIEW_COUNTS)[number])) {
    return 'Selecciona una cantidad de reseñas válida.'
  }
  return null
}

export function validateTaskForm(
  title: string,
  assignedTo: string,
  description?: string,
  dueDate?: string
): string | null {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return 'El título de la tarea es obligatorio.'
  if (trimmedTitle.length < 3) return 'El título debe tener al menos 3 caracteres.'
  if (trimmedTitle.length > 200) return 'El título no puede superar 200 caracteres.'
  if (!assignedTo) return 'Debes asignar la tarea a un empleado.'
  if (description && description.trim().length > 1000) {
    return 'La descripción no puede superar 1000 caracteres.'
  }
  if (dueDate) {
    const parsed = new Date(`${dueDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return 'La fecha límite no es válida.'
  }
  return null
}

export function validateCreateUserForm(data: {
  username: string
  email: string
  firstName: string
  lastName: string
  cedula: string
  telefono: string
}): string | null {
  return (
    validateUsername(data.username) ||
    validateEmail(data.email) ||
    validateName(data.firstName, 'nombre') ||
    validateName(data.lastName, 'apellido') ||
    validateCedula(data.cedula) ||
    validatePhone(data.telefono)
  )
}

export function validateEditUserForm(data: {
  username: string
  email: string
  firstName: string
  lastName: string
  cedula: string
  telefono: string
}): string | null {
  return validateCreateUserForm(data)
}

export function validateProfileForm(data: {
  username: string
  email: string
  firstName: string
  lastName: string
  cedula: string
  phone: string
}): string | null {
  return (
    validateUsername(data.username) ||
    validateEmail(data.email) ||
    validateName(data.firstName, 'nombre', true) ||
    validateName(data.lastName, 'apellido', true) ||
    validateCedula(data.cedula) ||
    validatePhone(data.phone)
  )
}
