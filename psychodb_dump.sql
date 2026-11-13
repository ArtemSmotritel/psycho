--
-- PostgreSQL database dump
--

\restrict 06bVI1MVCK8s1xC8gQvOyoz4GO10MEOW1Vuwvwo8I4gaq72IQctgEKibVh4DVWy

-- Dumped from database version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: ensure_user_role_rows(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_user_role_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO clients (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO psychologists (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id text DEFAULT gen_random_uuid() NOT NULL,
    psycho_id text NOT NULL,
    client_id text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    google_meet_link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    whiteboard_snapshot_url text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    google_calendar_event_id text,
    whiteboard_elements jsonb,
    whiteboard_files jsonb,
    CONSTRAINT appointments_no_self CHECK ((psycho_id <> client_id))
);


--
-- Name: associative_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.associative_images (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    psychologist_id text NOT NULL,
    name text NOT NULL,
    file_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attachment_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachment_files (
    id text DEFAULT gen_random_uuid() NOT NULL,
    attachment_id text NOT NULL,
    file_id text NOT NULL,
    file_type text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attachment_files_file_type_check CHECK ((file_type = ANY (ARRAY['image'::text, 'audio'::text])))
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id text DEFAULT gen_random_uuid() NOT NULL,
    appointment_id text NOT NULL,
    author_id text NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attachments_type_check CHECK ((type = ANY (ARRAY['note'::text, 'impression'::text, 'recommendation'::text])))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    user_id text NOT NULL,
    username text,
    phone text,
    telegram text,
    instagram text
);


--
-- Name: email_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_outbox (
    id text DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    variant text,
    recipient_user_id text,
    appointment_id text,
    attachment_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    scheduled_for timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    recipient_email text,
    invitation_id text,
    CONSTRAINT email_outbox_recipient_present CHECK (((recipient_user_id IS NOT NULL) OR (recipient_email IS NOT NULL)))
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id text DEFAULT gen_random_uuid() NOT NULL,
    original_name text NOT NULL,
    stored_name text NOT NULL,
    mime_type text NOT NULL,
    size bigint NOT NULL,
    uploaded_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: impression_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impression_completions (
    attachment_id text NOT NULL,
    client_response text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    psychologist_id text NOT NULL,
    invited_email text NOT NULL,
    token text DEFAULT (gen_random_uuid())::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: psychologist_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.psychologist_clients (
    client_id text NOT NULL,
    psycho_id text NOT NULL,
    disconnected_at timestamp with time zone,
    CONSTRAINT psychologist_clients_no_self CHECK ((client_id <> psycho_id))
);


--
-- Name: psychologists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.psychologists (
    user_id text NOT NULL
);


--
-- Name: recommendation_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendation_reactions (
    attachment_id text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    client_comment text,
    psychologist_reply text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    name character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    active_role text,
    CONSTRAINT user_active_role_check CHECK ((active_role = ANY (ARRAY['psycho'::text, 'client'::text])))
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: associative_images associative_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.associative_images
    ADD CONSTRAINT associative_images_pkey PRIMARY KEY (id);


--
-- Name: attachment_files attachment_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment_files
    ADD CONSTRAINT attachment_files_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (user_id);


--
-- Name: email_outbox email_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: files files_stored_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_stored_name_key UNIQUE (stored_name);


--
-- Name: impression_completions impression_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impression_completions
    ADD CONSTRAINT impression_completions_pkey PRIMARY KEY (attachment_id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: psychologist_clients psychologist_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psychologist_clients
    ADD CONSTRAINT psychologist_clients_pkey PRIMARY KEY (client_id, psycho_id);


--
-- Name: psychologists psychologists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psychologists
    ADD CONSTRAINT psychologists_pkey PRIMARY KEY (user_id);


--
-- Name: recommendation_reactions recommendation_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_reactions
    ADD CONSTRAINT recommendation_reactions_pkey PRIMARY KEY (attachment_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (name);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- Name: appointments_psycho_id_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_psycho_id_client_id_idx ON public.appointments USING btree (psycho_id, client_id);


--
-- Name: attachment_files_attachment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachment_files_attachment_id_idx ON public.attachment_files USING btree (attachment_id);


--
-- Name: attachments_appointment_id_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_appointment_id_type_idx ON public.attachments USING btree (appointment_id, type);


--
-- Name: attachments_author_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_author_id_idx ON public.attachments USING btree (author_id);


--
-- Name: email_outbox_dedup; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_outbox_dedup ON public.email_outbox USING btree (type, COALESCE(appointment_id, ''::text), COALESCE(attachment_id, ''::text), COALESCE(invitation_id, ''::text), COALESCE(recipient_user_id, ''::text), COALESCE(recipient_email, ''::text), COALESCE(variant, ''::text));


--
-- Name: email_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_outbox_pending ON public.email_outbox USING btree (status, scheduled_for) WHERE (status = 'pending'::text);


--
-- Name: idx_associative_images_psychologist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_associative_images_psychologist ON public.associative_images USING btree (psychologist_id);


--
-- Name: idx_invitations_invited_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_invited_email ON public.invitations USING btree (invited_email);


--
-- Name: idx_invitations_psychologist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_psychologist_id ON public.invitations USING btree (psychologist_id);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: user user_role_rows; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_role_rows AFTER INSERT ON public."user" FOR EACH ROW EXECUTE FUNCTION public.ensure_user_role_rows();


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_psycho_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_psycho_id_fkey FOREIGN KEY (psycho_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: associative_images associative_images_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.associative_images
    ADD CONSTRAINT associative_images_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: associative_images associative_images_psychologist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.associative_images
    ADD CONSTRAINT associative_images_psychologist_id_fkey FOREIGN KEY (psychologist_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: attachment_files attachment_files_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment_files
    ADD CONSTRAINT attachment_files_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON DELETE CASCADE;


--
-- Name: attachment_files attachment_files_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment_files
    ADD CONSTRAINT attachment_files_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: email_outbox email_outbox_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: email_outbox email_outbox_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON DELETE CASCADE;


--
-- Name: email_outbox email_outbox_invitation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.invitations(id) ON DELETE CASCADE;


--
-- Name: email_outbox email_outbox_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: files files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: impression_completions impression_completions_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impression_completions
    ADD CONSTRAINT impression_completions_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_psychologist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_psychologist_id_fkey FOREIGN KEY (psychologist_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: psychologist_clients psychologist_clients_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psychologist_clients
    ADD CONSTRAINT psychologist_clients_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: psychologist_clients psychologist_clients_psycho_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psychologist_clients
    ADD CONSTRAINT psychologist_clients_psycho_id_fkey FOREIGN KEY (psycho_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: psychologists psychologists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psychologists
    ADD CONSTRAINT psychologists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: recommendation_reactions recommendation_reactions_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_reactions
    ADD CONSTRAINT recommendation_reactions_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 06bVI1MVCK8s1xC8gQvOyoz4GO10MEOW1Vuwvwo8I4gaq72IQctgEKibVh4DVWy



















// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

Table "account" {
  "id" text [pk, not null]
  "accountId" text [not null]
  "providerId" text [not null]
  "userId" text [not null]
  "accessToken" text
  "refreshToken" text
  "idToken" text
  "accessTokenExpiresAt" timestamp
  "refreshTokenExpiresAt" timestamp
  "scope" text
  "password" text
  "createdAt" timestamp [not null, default: `CURRENT_TIMESTAMP`]
  "updatedAt" timestamp [not null]

  Indexes {
    userId [type: btree, name: "account_userId_idx"]
  }
}

Table "appointments" {
  "id" text [pk, not null, default: `gen_random_uuid()`]
  "psycho_id" text [not null]
  "client_id" text [not null]
  "start_time" timestamp [not null]
  "end_time" timestamp [not null]
  "google_meet_link" text
  "created_at" timestamp [not null, default: `now()`]
  "whiteboard_snapshot_url" text
  "started_at" timestamp
  "ended_at" timestamp
  "google_calendar_event_id" text
  "whiteboard_elements" jsonb
  "whiteboard_files" jsonb

  Checks {
    `(psycho_id <> client_id)` [name: 'appointments_no_self']
  }

  Indexes {
    (psycho_id, client_id) [type: btree, name: "appointments_psycho_id_client_id_idx"]
  }
}

Table "associative_images" {
  "id" text [pk, not null, default: `(gen_random_uuid())::text`]
  "psychologist_id" text [not null]
  "name" text [not null]
  "file_id" text [not null]
  "created_at" timestamp [not null, default: `now()`]
  "updated_at" timestamp [not null, default: `now()`]

  Indexes {
    psychologist_id [type: btree, name: "idx_associative_images_psychologist"]
  }
}

Table "attachment_files" {
  "id" text [pk, not null, default: `gen_random_uuid()`]
  "attachment_id" text [not null]
  "file_id" text [not null]
  "file_type" text [not null]
  "position" integer [not null, default: 0]
  "created_at" timestamp [not null, default: `now()`]

  Checks {
    `(file_type = ANY (ARRAY['image'::text, 'audio'::text]))` [name: 'attachment_files_file_type_check']
  }

  Indexes {
    attachment_id [type: btree, name: "attachment_files_attachment_id_idx"]
  }
}

Table "attachments" {
  "id" text [pk, not null, default: `gen_random_uuid()`]
  "appointment_id" text [not null]
  "author_id" text [not null]
  "type" text [not null]
  "name" text [not null]
  "text" text
  "created_at" timestamp [not null, default: `now()`]
  "updated_at" timestamp [not null, default: `now()`]

  Checks {
    `(type = ANY (ARRAY['note'::text, 'impression'::text, 'recommendation'::text]))` [name: 'attachments_type_check']
  }

  Indexes {
    (appointment_id, type) [type: btree, name: "attachments_appointment_id_type_idx"]
    author_id [type: btree, name: "attachments_author_id_idx"]
  }
}

Table "clients" {
  "user_id" text [pk, not null]
  "username" text
  "phone" text
  "telegram" text
  "instagram" text
}

Table "email_outbox" {
  "id" text [pk, not null, default: `gen_random_uuid()`]
  "type" text [not null]
  "variant" text
  "recipient_user_id" text
  "appointment_id" text
  "attachment_id" text
  "status" text [not null, default: `'pending'::text`]
  "attempts" integer [not null, default: 0]
  "last_error" text
  "scheduled_for" timestamp [not null, default: `now()`]
  "created_at" timestamp [not null, default: `now()`]
  "sent_at" timestamp
  "recipient_email" text
  "invitation_id" text

  Checks {
    `((recipient_user_id IS NOT NULL) OR (recipient_email IS NOT NULL))` [name: 'email_outbox_recipient_present']
  }

  Indexes {
    (type, `COALESCE(appointment_id,''::text)`, `COALESCE(attachment_id,''::text)`, `COALESCE(invitation_id,''::text)`, `COALESCE(recipient_user_id,''::text)`, `COALESCE(recipient_email,''::text)`, `COALESCE(variant,''::text)`) [type: btree, unique, name: "email_outbox_dedup"]
    (status, scheduled_for) [type: btree, name: "email_outbox_pending"]
  }
}

Table "files" {
  "id" text [pk, not null, default: `gen_random_uuid()`]
  "original_name" text [not null]
  "stored_name" text [unique, not null]
  "mime_type" text [not null]
  "size" bigint [not null]
  "uploaded_by" text [not null]
  "created_at" timestamp [not null, default: `now()`]
}

Table "impression_completions" {
  "attachment_id" text [pk, not null]
  "client_response" text [not null]
  "created_at" timestamp [not null, default: `now()`]
}

Table "invitations" {
  "id" text [pk, not null, default: `(gen_random_uuid())::text`]
  "psychologist_id" text [not null]
  "invited_email" text [not null]
  "token" text [unique, not null, default: `(gen_random_uuid())::text`]
  "status" text [not null, default: `'pending'::text`]
  "created_at" timestamp [not null, default: `now()`]

  Indexes {
    invited_email [type: btree, name: "idx_invitations_invited_email"]
    psychologist_id [type: btree, name: "idx_invitations_psychologist_id"]
    token [type: btree, name: "idx_invitations_token"]
  }
}

Table "psychologist_clients" {
  "client_id" text [not null]
  "psycho_id" text [not null]
  "disconnected_at" timestamp

  Checks {
    `(client_id <> psycho_id)` [name: 'psychologist_clients_no_self']
  }

  Indexes {
    (client_id, psycho_id) [pk, name: "psychologist_clients_pkey"]
  }
}

Table "psychologists" {
  "user_id" text [pk, not null]
}

Table "recommendation_reactions" {
  "attachment_id" text [pk, not null]
  "done" boolean [not null, default: false]
  "client_comment" text
  "psychologist_reply" text
  "updated_at" timestamp [not null, default: `now()`]
}

Table "schema_migrations" {
  "name" "character varying(255)" [pk, not null]
  "applied_at" timestamp [default: `CURRENT_TIMESTAMP`]
}

Table "session" {
  "id" text [pk, not null]
  "expiresAt" timestamp [not null]
  "token" text [unique, not null]
  "createdAt" timestamp [not null, default: `CURRENT_TIMESTAMP`]
  "updatedAt" timestamp [not null]
  "ipAddress" text
  "userAgent" text
  "userId" text [not null]

  Indexes {
    userId [type: btree, name: "session_userId_idx"]
  }
}

Table "user" {
  "id" text [pk, not null]
  "name" text [not null]
  "email" text [unique, not null]
  "emailVerified" boolean [not null]
  "image" text
  "createdAt" timestamp [not null, default: `CURRENT_TIMESTAMP`]
  "updatedAt" timestamp [not null, default: `CURRENT_TIMESTAMP`]
  "active_role" text

  Checks {
    `(active_role = ANY (ARRAY['psycho'::text, 'client'::text]))` [name: 'user_active_role_check']
  }
}

Table "verification" {
  "id" text [pk, not null]
  "identifier" text [not null]
  "value" text [not null]
  "expiresAt" timestamp [not null]
  "createdAt" timestamp [not null, default: `CURRENT_TIMESTAMP`]
  "updatedAt" timestamp [not null, default: `CURRENT_TIMESTAMP`]

  Indexes {
    identifier [type: btree, name: "verification_identifier_idx"]
  }
}

Ref "account_userId_fkey":"user"."id" <? "account"."userId" [delete: cascade]

Ref "appointments_client_id_fkey":"user"."id" <? "appointments"."client_id" [delete: cascade]

Ref "appointments_psycho_id_fkey":"user"."id" <? "appointments"."psycho_id" [delete: cascade]

Ref "associative_images_file_id_fkey":"files"."id" <? "associative_images"."file_id"

Ref "associative_images_psychologist_id_fkey":"user"."id" <? "associative_images"."psychologist_id" [delete: cascade]

Ref "attachment_files_attachment_id_fkey":"attachments"."id" <? "attachment_files"."attachment_id" [delete: cascade]

Ref "attachment_files_file_id_fkey":"files"."id" <? "attachment_files"."file_id" [delete: cascade]

Ref "attachments_appointment_id_fkey":"appointments"."id" <? "attachments"."appointment_id" [delete: cascade]

Ref "attachments_author_id_fkey":"user"."id" <? "attachments"."author_id" [delete: cascade]

Ref "clients_user_id_fkey":"user"."id" <? "clients"."user_id" [update: cascade, delete: cascade]

Ref "email_outbox_appointment_id_fkey":"appointments"."id" ?<? "email_outbox"."appointment_id" [delete: cascade]

Ref "email_outbox_attachment_id_fkey":"attachments"."id" ?<? "email_outbox"."attachment_id" [delete: cascade]

Ref "email_outbox_invitation_id_fkey":"invitations"."id" ?<? "email_outbox"."invitation_id" [delete: cascade]

Ref "email_outbox_recipient_user_id_fkey":"user"."id" ?<? "email_outbox"."recipient_user_id" [delete: cascade]

Ref "files_uploaded_by_fkey":"user"."id" <? "files"."uploaded_by" [delete: cascade]

Ref "impression_completions_attachment_id_fkey":"attachments"."id" <? "impression_completions"."attachment_id" [delete: cascade]

Ref "invitations_psychologist_id_fkey":"user"."id" <? "invitations"."psychologist_id" [delete: cascade]

Ref "psychologist_clients_client_id_fkey":"user"."id" <? "psychologist_clients"."client_id" [update: cascade, delete: cascade]

Ref "psychologist_clients_psycho_id_fkey":"user"."id" <? "psychologist_clients"."psycho_id" [update: cascade, delete: cascade]

Ref "psychologists_user_id_fkey":"user"."id" <? "psychologists"."user_id" [update: cascade, delete: cascade]

Ref "recommendation_reactions_attachment_id_fkey":"attachments"."id" <? "recommendation_reactions"."attachment_id" [delete: cascade]

Ref "session_userId_fkey":"user"."id" <? "session"."userId" [delete: cascade]
