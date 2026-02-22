import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { auth } from "~/services/auth.service";

export default function LoginChoice() {
  function google() {
    auth.signIn.social({
      provider: "google",
      callbackURL: "http://localhost:5173/psychologist",
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Psychologist Login</CardTitle>
          <CardDescription>
            Sign in with your Google account to access the portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={google}
            className="w-full flex items-center justify-center space-x-2 text-base font-medium rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 py-2.5 h-auto"
          >
            <img
              src="/public/images/google_logo.png"
              alt="Google Logo"
              className="mr-2 h-5 w-5"
            />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
