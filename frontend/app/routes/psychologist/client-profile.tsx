import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Phone, MessageSquare, Instagram, Mail, Edit, Calendar, History, TrendingUp, ArrowRight, ArrowLeft, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { ClientForm } from "@/components/ClientForm";
import { Link } from "react-router";
import { SessionForm } from "@/components/SessionForm";
import { ActionsSection, ActionItem } from "@/components/ActionsSection";
import { formatAppDate } from "~/utils/utils";

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
  type?: "telegram" | "instagram" | "email" | "phone";
}

function ContactItem({ icon, label, value, onCopy, type }: ContactItemProps) {
  const displayValue = value || "-";
  
  // Helper function to get the appropriate link based on type
  const getLink = () => {
    if (!value) return null;
    
    switch (type) {
      case "telegram":
        const telegramUsername = value.startsWith('@') ? value.slice(1) : value;
        return `https://t.me/${telegramUsername}`;
      case "instagram":
        const instagramUsername = value.startsWith('@') ? value.slice(1) : value;
        return `https://instagram.com/${instagramUsername}`;
      case "email":
        return `mailto:${value}`;
      case "phone":
        return `tel:${value.replace(/\s+/g, '')}`;
      default:
        return null;
    }
  };

  const link = getLink();

  return (
    <div className="flex items-center justify-between flex-wrap">
      <div className="flex items-center space-x-2">
        {icon}
        <span className="font-medium">{label}:</span>
      </div>
      <div className="flex items-center space-x-1">
        {link ? (
          <Link
            to={link}
            target={type === "email" || type === "phone" ? undefined : "_blank"}
            rel={type === "email" || type === "phone" ? undefined : "noopener noreferrer"}
            className="hover:underline"
          >
            {displayValue}
          </Link>
        ) : (
          <span>{displayValue}</span>
        )}
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
    phone: "+380731488420",
    telegram: "@blinolad",
    instagram: "@blinolad",
    registrationDate: new Date(2024, 0, 1),
    lastSession: { id: "session1", date: new Date(2024, 3, 18, 15, 0) },
    nextSession: { id: "session2", date: new Date(2024, 3, 25, 15, 0) },
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
    <>
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
                {formatAppDate(client.registrationDate)}
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
              type="phone"
              onCopy={() => copyToClipboard(client.phone, "Phone number")}
            />

            <ContactItem
              icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
              label="Telegram"
              value={client.telegram}
              type="telegram"
              onCopy={() => copyToClipboard(client.telegram, "Telegram username")}
            />

            <ContactItem
              icon={<Instagram className="h-4 w-4 text-muted-foreground" />}
              label="Instagram"
              value={client.instagram}
              type="instagram"
              onCopy={() => copyToClipboard(client.instagram, "Instagram username")}
            />

            <ContactItem
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              label="Email"
              value={client.email}
              type="email"
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
                {formatAppDate(client.lastSession.date)}
              </div>
              <div>
                <span className="font-medium">Next Session:</span>{" "}
                {client.nextSession ? formatAppDate(client.nextSession.date) : "-"}
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

      <ActionsSection title="Actions">
        <ClientForm
          mode="edit"
          trigger={
            <ActionItem
              icon={<Edit className="h-6 w-6" />}
              label="Edit client"
            />
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

        <SessionForm
          mode="add"
          trigger={
            <ActionItem
              icon={<Calendar className="h-6 w-6" />}
              label="Schedule Session"
            />
          }
          onSubmit={(values) => {
            console.log("Scheduling session:", values);
            // TODO: Implement actual session scheduling
          }}
        />

        <ActionItem
          icon={<TrendingUp className="h-6 w-6" />}
          label="View Progress"
          to={`/psychologist/clients/${client.id}/progress`}
        />

        {client.lastSession && (
          <ActionItem
            icon={<ArrowLeft className="h-6 w-6" />}
            label="View Last Session"
            to={`/psychologist/clients/${client.id}/sessions/${client.lastSession.id}`}
            subtext={formatAppDate(client.lastSession.date)}
          />
        )}

        <ActionItem
          icon={<History className="h-6 w-6" />}
          label="View Session History"
          to={`/psychologist/clients/${client.id}/sessions`}
        />

        {client.nextSession && (
          <ActionItem
            icon={<ArrowRight className="h-6 w-6" />}
            label="View Next Session"
            to={`/psychologist/clients/${client.id}/sessions/${client.nextSession.id}`}
            subtext={formatAppDate(client.nextSession.date)}
          />
        )}
      </ActionsSection>
    </>
  );
} 