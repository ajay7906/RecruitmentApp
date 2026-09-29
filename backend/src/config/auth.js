export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_OPTIONS = Object.freeze({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/v1/auth',maxAge:7*24*60*60*1000});
