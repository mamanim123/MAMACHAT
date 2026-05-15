const templatesBase64 = "W3siaWQiOiJzYWZlLWJ1Zy1maXgiLCJ0aXRsZSI6IuyViOyghO2VnCDrsoTqt7gg7IiY7KCVIiwic3VtbWFyeSI6IuybkOyduCDrtoTshJ0g7ZuEIOy1nOyGjCDrspTsnITroZwg7IiY7KCV7ZWY6rOgLCDtjKjsuZgg7Iq57J24IO2dkOumhOycvOuhnCDsoIHsmqntlanri4jri6QuIiwiYmVzdEZvciI6WyLsmKTrpZgg7IiY7KCVIiwi7Lu07YyM7J28IOyXkOufrCIsIlVJIOq5qOynkCIsIkFQSSDsi6TtjKgiXSwic3RlcHMiOlt7ImtleSI6ImFuYWx5emUiLCJyb2xlIjoiQXJjaGl0ZWN0IiwidGl0bGUiOiLsm5Dsnbgg67aE7ISdIiwiZ29hbCI6IuymneyDgSwg7JeQ65+sIOudvOyduCwg6rSA66CoIO2MjOydvCDtm4Trs7Trpbwg7KCV66as7ZWp64uI64ukLiIsIm91dHB1dCI6IuybkOyduCDtm4Trs7TsmYAg7ZmV7J247ZWgIO2MjOydvCDrqqnroZ0ifSx7ImtleSI6InBsYW4iLCJyb2xlIjoiQXJjaGl0ZWN0IiwidGl0bGUiOiLsiJjsoJUg6rOE7ZqNIiwiZ29hbCI6IuyImOyglSDrspTsnITrpbwg7KKB7Z6I6rOgIOuzgOqyvSDsiJzshJzrpbwg7KCV7ZWp64uI64ukLiIsIm91dHB1dCI6IuyImOyglSDrjIDsg4Eg7YyM7J28LCDrs4Dqsr0g7J207JygLCDqsoDspp0g67Cp67KVIn0seyJrZXkiOiJwYXRjaCIsInJvbGUiOiJCdWlsZGVyIiwidGl0bGUiOiLtjKjsuZgg7IOd7ISxIiwiZ29hbCI6IuyngOygleuQnCDtjIzsnbzrp4wg7IiY7KCV7JWI7Jy866GcIOunjOuTreuLiOuLpC4iLCJvdXRwdXQiOiJwYXRjaCBwYXlsb2FkIOuYkOuKlCDrs4Dqsr3slYgifSx7ImtleSI6InJldmlldyIsInJvbGUiOiJSZXZpZXdlciIsInRpdGxlIjoi66as67ewIiwiZ29hbCI6IuuzgOqyvSDrspTsnIQsIOu2gOyekeyaqSwg66Gk67CxIOqwgOuKpeyEseydhCDsoJDqsoDtlanri4jri6QuIiwib3V0cHV0Ijoi7Iq57J24IOqwgOuKpSDsl6zrtoDsmYAg7JyE7ZeY64+EIn0seyJrZXkiOiJhcHByb3ZlIiwicm9sZSI6IlVzZXIiLCJ0aXRsZSI6IuyKueyduC/soIHsmqkiLCJnb2FsIjoi7IKs7Jqp7J6Q6rCAIHByZXZpZXfrpbwg67O06rOgIGFwcGx5IOuYkOuKlCByb2xsYmFja+2VqeuLiOuLpC4iLCJvdXRwdXQiOiLsoIHsmqkg6rKw6rO87JmAIOqygOymnSDqsrDqs7wifV19LHsiaWQiOiJ1aS1wb2xpc2giLCJ0aXRsZSI6IlVJIOygleumrCIsInN1bW1hcnkiOiLroIjsnbTslYTsm4MsIOusuOq1rCwg67KE7Yq8IOychOy5mCDqsJnsnYAg7ZmU66m0IOqwnOyEoOydhCDsnpHsnYAg64uo7JyE66GcIOyymOumrO2VqeuLiOuLpC4iLCJiZXN0Rm9yIjpbIuugiOydtOyVhOybgyDsobDsoJUiLCLrrLjqtawg67OA6rK9Iiwi67KE7Yq8IOychOy5mCIsIuyCrOydtOuTnOuwlCDsoJXrpqwiXSwic3RlcHMiOlt7ImtleSI6Imluc3BlY3QiLCJyb2xlIjoiQXJjaGl0ZWN0IiwidGl0bGUiOiLtmZTrqbQg6rWs7KGwIO2ZleyduCIsImdvYWwiOiLqtIDroKgg7Lu07Y+s64SM7Yq47JmAIOyKpO2DgOydvCDsnITsuZjrpbwg7LC+7Iq164uI64ukLiIsIm91dHB1dCI6IuyImOygle2VoCDsu7Ttj6zrhIztirjsmYAgVUkg66y47KCcIOyalOyVvSJ9LHsia2V5IjoibWluaW1hbC1jaGFuZ2UiLCJyb2xlIjoiQnVpbGRlciIsInRpdGxlIjoi7LWc7IaMIOuzgOqyvSIsImdvYWwiOiLquLDriqUg66Gc7KeB7J2AIOqxtOuTnOumrOyngCDslYrqs6AgVUnrp4wg7IiY7KCV7ZWp64uI64ukLiIsIm91dHB1dCI6IuyekeydgCBVSSDtjKjsuZgifSx7ImtleSI6InZpc3VhbC1jaGVjayIsInJvbGUiOiJSZXZpZXdlciIsInRpdGxlIjoi7Iuc6rCBIO2ZleyduCIsImdvYWwiOiLqsrnsuagsIOq5qOynkCwg67CY7J2R7ZiVIOusuOygnOulvCDtmZXsnbjtlanri4jri6QuIiwib3V0cHV0Ijoi7ZmV7J24IOyytO2BrOumrOyKpO2KuCJ9LHsia2V5IjoicmVjb3JkIiwicm9sZSI6IlN5c3RlbSIsInRpdGxlIjoi6riw66GdIiwiZ29hbCI6InBsYW4ubWTsl5Ag67OA6rK9IOydtOycoOyZgCDqsrDqs7zrpbwg64Ko6rmB64uI64ukLiIsIm91dHB1dCI6IuyekeyXhSDquLDroZ0ifV19LHsiaWQiOiJmZWF0dXJlLWFkZGl0aW9uIiwidGl0bGUiOiLsi6Dqt5wg6riw64qlIOy2lOqwgCIsInN1bW1hcnkiOiLsnpHsnYAg6riw64ql7J2EIOuwseyXlOuTnCwgVUksIOqygOymnSDsiJzshJzroZwg7JWI7KCE7ZWY6rKMIOu2meyeheuLiOuLpC4iLCJiZXN0Rm9yIjpbIuyDiCDtjKjrhJAiLCLsg4ggQVBJIiwi7IOIIOuyhO2KvCIsIuyDiCDsoIDsnqUg6riw64qlIl0sInN0ZXBzIjpbeyJrZXkiOiJzY29wZSIsInJvbGUiOiJBcmNoaXRlY3QiLCJ0aXRsZSI6Iuq4sOuKpSDrspTsnIQg7ZmV7KCVIiwiZ29hbCI6IjHssKgg6rWs7ZiEIOuylOychOyZgCDrgpjspJHsl5Ag7ZWgIOydvOydhCDrtoTrpqztlanri4jri6QuIiwib3V0cHV0IjoiMeywqCDrspTsnIQgLyDsoJzsmbgg67KU7JyEIn0seyJrZXkiOiJiYWNrZW5kIiwicm9sZSI6IkJ1aWxkZXIiLCJ0aXRsZSI6IuuwseyXlOuTnCDsl7DqsrAiLCJnb2FsIjoi7KCA7J6lLCDsobDtmowsIOyggeyaqSBBUEnrpbwg66i87KCAIOunjOuTreuLiOuLpC4iLCJvdXRwdXQiOiJBUEnsmYAgc21va2UgdGVzdCJ9LHsia2V5IjoidWkiLCJyb2xlIjoiQnVpbGRlciIsInRpdGxlIjoiVUkg7Jew6rKwIiwiZ29hbCI6IuyCrOyaqeyekOqwgCDrs7wg7IiYIOyeiOuKlCDtjKjrhJDqs7wg67KE7Yq87J2EIOunjOuTreuLiOuLpC4iLCJvdXRwdXQiOiLtjKjrhJAg65iQ64qUIOy7tO2PrOuEjO2KuCJ9LHsia2V5IjoidmVyaWZ5Iiwicm9sZSI6IlJldmlld2VyIiwidGl0bGUiOiLqsoDspp0iLCJnb2FsIjoi7ISx6rO1L+yLpO2MqC/ruYgg7IOB7YOc66W8IO2ZleyduO2VqeuLiOuLpC4iLCJvdXRwdXQiOiLqsoDspp0g6rKw6rO8In1dfSx7ImlkIjoidG9rZW4tZWZmaWNpZW50LXJ1biIsInRpdGxlIjoi7Yag7YGwIOygiOyVvSDsi6TtlokiLCJzdW1tYXJ5Ijoi66y07J6R7KCVIO2MjOydvOydhCDsnb3sp4Ag7JWK6rOgIOyduOuNseyKpCwg7ZuE67O0IO2MjOydvCwg7JWV7LaVIOqysOqzvOulvCDsmrDshKAg7IKs7Jqp7ZWp64uI64ukLiIsImJlc3RGb3IiOlsi7YGwIO2UhOuhnOygne2KuCDrtoTshJ0iLCLthqDtgbAg7KCI7JW9Iiwi6ri0IOuhnOq3uCDrtoTshJ0iLCLtm4Trs7Qg7YyM7J28IOq4sOuwmCDsnpHsl4UiXSwic3RlcHMiOlt7ImtleSI6ImJ1ZGdldCIsInJvbGUiOiJBcmNoaXRlY3QiLCJ0aXRsZSI6Iu2GoO2BsCDsnITtl5jrj4Qg7ZmV7J24IiwiZ29hbCI6Ik1pbmkgVG9rZW4gQmFy7JmAIHRva2VuQnVkZ2V07Jy866GcIOychO2XmOuPhOulvCDrtIXri4jri6QuIiwib3V0cHV0Ijoib2sgLyB3YXJuIC8gZGFuZ2VyIn0seyJrZXkiOiJpbmRleCIsInJvbGUiOiJBcmNoaXRlY3QiLCJ0aXRsZSI6IuyduOuNseyKpCDsmrDshKAg7YOQ7IOJIiwiZ29hbCI6IndvcmtzcGFjZUluZGV47JeQ7IScIO2bhOuztCDtjIzsnbzsnYQg66i87KCAIOywvuyKteuLiOuLpC4iLCJvdXRwdXQiOiJ3b3Jrc3BhY2VDYW5kaWRhdGVzIn0seyJrZXkiOiJjb21wcmVzcyIsInJvbGUiOiJTeXN0ZW0iLCJ0aXRsZSI6Iuy2nOugpSDslZXstpUiLCJnb2FsIjoi6ri0IOuqheuguSDqsrDqs7zripQgY29tcHJlc3NlZE91dHB1dOycvOuhnCDsmpTslb3tlanri4jri6QuIiwib3V0cHV0IjoicmF3L2NvbXByZXNzZWQg67mE6rWQIn0seyJrZXkiOiJuYXJyb3ciLCJyb2xlIjoiQnVpbGRlciIsInRpdGxlIjoi7KKB7J2AIOuylOychCDsnpHsl4UiLCJnb2FsIjoi7ZuE67O0IO2MjOydvCDspJHsi6zsnLzroZzrp4wg7IiY7KCV7ZWp64uI64ukLiIsIm91dHB1dCI6Iuy1nOyGjCDsiJjsoJXslYgifV19XQ==";

const WORKFLOW_TEMPLATES = JSON.parse(Buffer.from(templatesBase64, "base64").toString("utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function listWorkflowTemplates() {
  return WORKFLOW_TEMPLATES.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    bestFor: item.bestFor,
    stepCount: item.steps.length
  }));
}

export function getWorkflowTemplate(templateId) {
  const found = WORKFLOW_TEMPLATES.find((item) => item.id === templateId);
  if (!found) return null;
  return clone(found);
}

export function buildWorkflowPrompt(templateId, input = {}) {
  const template = getWorkflowTemplate(templateId);
  if (!template) throw new Error("workflow template not found: " + templateId);

  const defaultGoal = "\uC0AC\uC6A9\uC790 \uC694\uCCAD\uC744 \uC548\uC804\uD558\uAC8C \uCC98\uB9AC\uD55C\uB2E4.";
  const userGoal = String(input.goal || "").trim() || defaultGoal;
  const workspaceRoot = String(input.workspaceRoot || "").trim();

  const lines = [
    "[Mamabot Workflow Template]",
    "templateId: " + template.id,
    "title: " + template.title,
    "",
    "\uC0AC\uC6A9\uC790 \uBAA9\uD45C:",
    userGoal,
    "",
    workspaceRoot ? "workspaceRoot: " + workspaceRoot : "",
    "",
    "\uC791\uC5C5 \uC6D0\uCE59:",
    "- \uBA3C\uC800 \uC6D0\uC778\uC744 \uBD84\uC11D\uD558\uACE0 \uC218\uC815 \uBC94\uC704\uB97C \uC881\uD78C\uB2E4.",
    "- \uD30C\uC77C\uC744 \uBC14\uB85C \uC218\uC815\uD558\uC9C0 \uB9D0\uACE0 \uD544\uC694\uD55C \uBCC0\uACBD\uC548\uC744 \uBA3C\uC800 \uC124\uBA85\uD55C\uB2E4.",
    "- \uAC00\uB2A5\uD55C \uACBD\uC6B0 Patch Approval / Rollback \uD750\uB984\uC744 \uC0AC\uC6A9\uD55C\uB2E4.",
    "- \uBD88\uD544\uC694\uD55C \uC804\uCCB4 \uD30C\uC77C \uD0D0\uC0C9\uC744 \uD53C\uD558\uACE0 workspaceIndex \uD6C4\uBCF4\uB97C \uC6B0\uC120 \uD65C\uC6A9\uD55C\uB2E4.",
    "- \uAE34 \uCD9C\uB825\uC740 raw \uB300\uC2E0 compressedOutput \uC694\uC57D\uC744 \uC6B0\uC120 \uD655\uC778\uD55C\uB2E4.",
    "",
    "\uB2E8\uACC4:",
    ...template.steps.map((step, index) => [
      String(index + 1) + ". " + step.title,
      "   role: " + step.role,
      "   goal: " + step.goal,
      "   output: " + step.output
    ].join("\n")),
    "",
    "\uCD5C\uC885 \uC751\uB2F5 \uD615\uC2DD:",
    "1. \uD604\uC7AC \uC0C1\uD669 \uC694\uC57D",
    "2. \uC218\uC815 \uB300\uC0C1 / \uC791\uC5C5 \uB300\uC0C1",
    "3. \uB2E8\uACC4\uBCC4 \uC2E4\uD589 \uACC4\uD68D",
    "4. \uC704\uD5D8 \uC694\uC18C",
    "5. \uB2E4\uC74C\uC5D0 \uC2E4\uD589\uD560 \uBA85\uB839 \uB610\uB294 \uD328\uCE58 \uC81C\uC548"
  ].filter(Boolean);

  return lines.join("\n");
}
