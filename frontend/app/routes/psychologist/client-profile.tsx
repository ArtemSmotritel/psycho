import { AppPageHeader } from "~/components/AppPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Copy, Phone, MessageSquare, Instagram, Mail, Edit } from "lucide-react";
import { toast } from "sonner";
import { ClientForm } from "@/components/ClientForm";

type ClientProfileProps = {
  params: {
    clientId: string;
  };
};

interface ContactItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onCopy: () => void;
}

function ContactItem({ icon, label, value, onCopy }: ContactItemProps) {
  const displayValue = value || "-";
  
  return (
    <div className="flex items-center justify-between flex-wrap">
      <div className="flex items-center space-x-2">
        {icon}
        <span className="font-medium">{label}:</span>
      </div>
      <div className="flex items-center space-x-1">
        <span>{displayValue}</span>
        {value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ClientProfile({ params }: ClientProfileProps) {
  // This would be replaced with actual data fetching
  const client = {
    id: params.clientId,
    username: "john_doe",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    telegram: "@johndoe",
    instagram: "@johndoe",
    registrationDate: new Date(2024, 0, 1),
    lastSession: new Date(2024, 3, 18, 15, 0),
    nextSession: new Date(2024, 3, 25, 15, 0),
    sessionsCount: 5,
    impressionsCount: 12,
    recommendationsCount: 3,
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} has been copied to your clipboard.`);
  };

  const handleEditClient = (values: any) => {
    console.log("Editing client:", values);
    // TODO: Implement actual client update
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <AppPageHeader text={`Client Profile: ${client.name}`} />
        <ClientForm
          mode="edit"
          trigger={
            <Button variant="outline">
              <Edit className="h-4 w-4" /> Edit client
            </Button>
          }
          initialData={{
            username: client.username,
            name: client.name,
            email: client.email,
            phone: client.phone,
            telegram: client.telegram,
            instagram: client.instagram,
          }}
          onSubmit={handleEditClient}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="font-medium">Username:</span> {client.username}
              </div>
              <div>
                <span className="font-medium">Name:</span> {client.name}
              </div>
              <div>
                <span className="font-medium">Registration Date:</span>{" "}
                {format(client.registrationDate, "PPP")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ContactItem
              icon={<Phone className="h-4 w-4 text-muted-foreground" />}
              label="Phone"
              value={client.phone}
              onCopy={() => copyToClipboard(client.phone, "Phone number")}
            />

            <ContactItem
              icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
              label="Telegram"
              value={client.telegram}
              onCopy={() => copyToClipboard(client.telegram, "Telegram username")}
            />

            <ContactItem
              icon={<Instagram className="h-4 w-4 text-muted-foreground" />}
              label="Instagram" 
              value={client.instagram}
              onCopy={() => copyToClipboard(client.instagram, "Instagram username")}
            />

            <ContactItem
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              label="Email"
              value={client.email}
              onCopy={() => copyToClipboard(client.email, "Email address")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="font-medium">Total Sessions:</span>{" "}
                {client.sessionsCount}
              </div>
              <div>
                <span className="font-medium">Last Session:</span>{" "}
                {format(client.lastSession, "PPP p")}
              </div>
              <div>
                <span className="font-medium">Next Session:</span>{" "}
                {client.nextSession ? format(client.nextSession, "PPP p") : "-"}
              </div>
              <div>
                <span className="font-medium">Total Impressions:</span>{" "}
                {client.impressionsCount}
              </div>
              <div>
                <span className="font-medium">Total Recommendations:</span>{" "}
                {client.recommendationsCount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 