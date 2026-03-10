CREATE POLICY "Users update own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());