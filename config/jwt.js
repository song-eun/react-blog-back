export const secretKey = process.env.JWT_SCR_KEY;
export const tokenLife = process.env.JWT_EXP;

export const cookieOptions = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};
