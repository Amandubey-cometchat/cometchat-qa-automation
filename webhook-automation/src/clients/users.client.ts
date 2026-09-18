import { apiRequest } from './cometchat.client';

export async function createTestUser(uid: string, name: string) {
  return apiRequest('POST', '/users', { uid, name });
}

export async function blockUser(uid: string, blockedUid: string) {
  return apiRequest('POST', `/users/${uid}/blockedusers`, { blockedUids: [blockedUid] });
}

export async function unblockUser(uid: string, blockedUid: string) {
  return apiRequest('DELETE', `/users/${uid}/blockedusers`, { blockedUids: [blockedUid] });
}
