import NextAuth from "next-auth";
import { authOptions } from "app/server/auth";

export default NextAuth(authOptions);
