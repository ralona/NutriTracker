import { randomBytes } from 'crypto';
import { storage } from './storage';

/**
 * Genera un token de invitación para un nuevo paciente
 * @param name Nombre del paciente
 * @param email Email del paciente
 * @param nutritionistId ID del nutricionista que realiza la invitación
 * @returns Objeto con el token y el enlace de invitación
 */
export async function createInvitation(name: string, email: string, nutritionistId: number) {
  // Generar token y fecha de expiración (7 días)
  const token = randomBytes(32).toString('hex');
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 7);
  
  // Crear usuario invitado pero inactivo
  await storage.createUser({
    email,
    name,
    password: '', // Se establecerá cuando el usuario acepte la invitación
    role: 'client',
    nutritionistId,
    active: false,
    inviteToken: token,
    inviteExpires: expireDate
  });
  
  // Generar enlace de invitación
  const inviteLink = `/invite/${token}`;
  
  return {
    token,
    inviteLink
  };
}

/**
 * Verifica si un token de invitación es válido
 * @param token Token de invitación
 * @returns El usuario asociado al token si es válido, undefined en caso contrario
 */
export async function verifyInvitationToken(token: string) {
  const user = await storage.getUserByInviteToken(token);
  
  if (!user) {
    return undefined;
  }
  
  // Verificar si la invitación ha expirado
  if (user.inviteExpires && new Date(user.inviteExpires) < new Date()) {
    return undefined;
  }
  
  return user;
}

/**
 * Activa una cuenta de usuario a partir de un token de invitación
 * @param token Token de invitación
 * @param password Nueva contraseña del usuario
 * @returns El usuario activado si la operación tuvo éxito, undefined en caso contrario
 */
export async function activateInvitation(token: string, password: string) {
  const user = await verifyInvitationToken(token);
  
  if (!user) {
    return undefined;
  }
  
  // Actualizar usuario con la contraseña y activarlo
  const updatedUser = await storage.updateUser(user.id, {
    password,
    active: true,
    inviteToken: null,
    inviteExpires: null
  });
  
  return updatedUser;
}