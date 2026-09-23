export const ADMIN_EMAILS = [
  'alinelasneau@gmail.com',
];

export function isAdminUser(user) {
  const email = user?.email?.trim().toLowerCase();
  return Boolean(email && ADMIN_EMAILS.includes(email));
}
