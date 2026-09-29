import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import {createHash,randomBytes} from 'node:crypto';
import {env} from '../../config/env.js';
export const hashPassword=password=>argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
export const verifyPassword=(password,passwordHash)=>argon2.verify(passwordHash,password);
export const generateAccessToken=userId=>jwt.sign({type:'access'},env.JWT_ACCESS_SECRET,{subject:userId,expiresIn:env.JWT_ACCESS_EXPIRES_IN,algorithm:'HS256'});
export const verifyAccessToken=token=>jwt.verify(token,env.JWT_ACCESS_SECRET,{algorithms:['HS256']});
export const generateRefreshToken=()=>randomBytes(48).toString('base64url');
export const hashToken=token=>createHash('sha256').update(token).digest('hex');
export const refreshExpiry=()=>{const match=env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/);if(!match)throw new Error('JWT_REFRESH_EXPIRES_IN must use a duration such as 7d.');const unit={s:1000,m:60000,h:3600000,d:86400000}[match[2]];return new Date(Date.now()+Number(match[1])*unit);};
export function readCookie(req,name){const raw=req.headers.cookie||'';for(const part of raw.split(';')){const i=part.indexOf('=');if(i<0)continue;if(part.slice(0,i).trim()===name)return decodeURIComponent(part.slice(i+1).trim());}return undefined;}
