export type UserType = 'celebrity' | 'fan' | 'admin'

export interface FanProfile {
  id: number
  display_name: string | null
  avatar_url: string | null
}

export interface CelebrityProfile {
  id: number
  stage_name: string
  category: string
  bio: string | null
}

export interface AuthUser {
  id: number
  email: string
  user_type: UserType
  status: string
  fan_profile?: FanProfile
  fanProfile?: FanProfile
  celebrity_profile?: CelebrityProfile
  celebrityProfile?: CelebrityProfile
}

export interface AuthResponse {
  message: string
  user: AuthUser
  access_token: string
  token_type: 'Bearer'
}
