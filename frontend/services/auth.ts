import api from "./api";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const loginUser = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>(
    "/auth/login",
    {
      email,
      password,
    }
  );

  return response.data;
};