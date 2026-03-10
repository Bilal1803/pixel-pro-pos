
-- Conversations table
CREATE TABLE public.ai_support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Новый чат',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
  ON public.ai_support_conversations
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Messages table
CREATE TABLE public.ai_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_support_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messages"
  ON public.ai_support_messages
  FOR ALL
  TO authenticated
  USING (conversation_id IN (
    SELECT id FROM public.ai_support_conversations WHERE company_id = get_user_company_id()
  ))
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.ai_support_conversations WHERE company_id = get_user_company_id()
  ));
