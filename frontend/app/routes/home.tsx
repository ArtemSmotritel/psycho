import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Link } from "react-router";

import type { Route } from "./+types/home"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Psycho - Professional Mental Health Platform" },
    { name: "description", content: "Connect with professional psychologists and take control of your mental health journey." },
  ]
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            Your Mental Health Journey Starts Here
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with professional psychologists and take the first step towards better mental health. Our platform makes it easy to find the right support for your needs.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/login">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/psychologist/login">I'm a Psychologist</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Platform</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Professional Network</CardTitle>
                <CardDescription>Access to certified psychologists</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Connect with experienced mental health professionals who are dedicated to helping you achieve your wellness goals.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>Your privacy is our priority</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  All sessions are conducted in a secure, confidential environment with end-to-end encryption to protect your privacy.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Flexible Scheduling</CardTitle>
                <CardDescription>Book sessions at your convenience</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Schedule appointments that fit your busy lifestyle with our easy-to-use booking system.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Start Your Journey?</h2>
          <p className="text-xl text-gray-600">
            Join thousands of people who have taken control of their mental health with our platform.
          </p>
          <Button asChild size="lg">
            <Link to="/login">Get Started Today</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
