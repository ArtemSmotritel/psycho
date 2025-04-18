import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function LoginChoice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome to Psycho</CardTitle>
          <CardDescription>Choose how you want to login</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link to="/login/psychologist">Login as Psychologist</Link>
          </Button>
          <Button asChild className="w-full" size="lg" variant="outline">
            <Link to="/login/client">Login as Client</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 