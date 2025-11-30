/**
 * Retrieves a unique user ID from localStorage.
 * If one doesn't exist, it creates a new UUID, stores it, and returns it.
 * This function is intended to be used only on the client-side.
 */
export function getUserId(): string {
  const USER_ID_KEY = "weather_app_user_id";
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}
