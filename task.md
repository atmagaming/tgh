We need to add the following functionality to our bot/app: **onboarding**, **storing person data**,
**contracts generation**, **documents signing**. Each one is a dedicated tool or agent. And maybe some more tools.

Context:

- we have people working on our game.
- we have sometimes new people
- people data are stored in the notion database: id = 99d87f1967d947b39d47e60ff0ac0cb1
- we also have roles database: id = 1faf42211d7948f9945eb5a33942e390
- we also have sensitive data database: id = 2f026381fbfd80cb802deadfad9f7e04
- how are these related: People is public data, contains just Name/nickname of the person. It also contains a
  relation "Role" which relates to Roles and contains current person's roles. Then we also have a field
  "Sensitive Data" that links to the sensitive data table. Sensitive Data contains stuff like salary, full
  name, surname, etc.
- we should add some tools related to Notion: GetDatabaseInfo(id) (returns properties with descriptions,
  number of elements), GetPage(id) - returns both content and properties,
  GetDatabasePages(propertiesToInclude), CreatePage(properties, optional database, optional parent page),
  EditPage(edited content, edited properties)
- these tools can be provided to specialized NotionAgent, that receives a general notion-related request and
  triggers a correct sequence of required tools. MasterAgent then has NotionAgent as a tool.
- using this agent, MasterAgent can: 1. check if some person already exists and retrieve its data; 2. check
  if they exist and some data is missing and/or required; 3. update missing data; 4. create new entries in
  related databases
  This concludes basic notion work description for the scope of our current task.

## Onboarding

Second, we have **onboarding**. This is when we have a new person and we need to add them to different places.
There is a minimal onboarding and full onboarding. The onboarding agent should try to do as much as possible.

Minimal **Onboarding**:

- **email** is provided
- **name** is provided
- **role** is provided

1. Add person (as a new entry) to People database, set in Roles relation the coresponding role.
2. The corresponding relation to sensitive data is created by automation in a few seconds. we might need to
   check and wait for a few times (probably need to add the Wait(seconds) tool)
3. We then also need to share (View permissions) with this email the People and Roles page, as well as the
   general Hypocrisy page (id = 19526381fbfd816ba133ce6806c3257f ). For this we also need a tool
   SharePage(pageId, email) to the NotionAgent. We also need to share (Edit Content permissions) the Tasks
   database (id = 2ec26381fbfd80f78a11ceed660e9a07 )

This concludes **minimal** onboarding

Full **Onboarding**:

- full name is provided (first name and surname - as in passport)
- passport number is provided, or some other official ID number
- working schedule is provided (hours per day, like 4,4,4,4,4,0,0 - means working from Monday to Friday 4 hours a day)
- salary is provided (we need hourly salary to write to the table, but agent can calculate it from monthly salary if needed)
- starting date is provided
- telegram account is provided

1. We do all the steps from minimal onboarding
2. We also fill in the sensitive data table with the provided information (full name, passport number, working schedule, salary, starting date)
3. We also add the person to a telegram group: -1003479491103 (if grammy allows/ or by telegram api, then add directly. alternatively we should sent the invite link: https://t.me/+8khDE0VnpjM0Mzg8 )
4. We also need to create a contract for this person. About this - later on.

This concludes **full** onboarding. If some data is missing, the agent should do as much as possible and then report what is missing and what was done to the user. The idea is that we should do onboarding partially.

## Contracts generation

For now, we only have NDA contract stored here: https://docs.google.com/document/d/1Jq1woEA2tygkt4Ueuz3VhbDZzhycKwf5_2TgyRQJkN4/edit?usp=drive_link

Overall, we should:

1. Make a new subfolder in the Agreements - People folder (https://drive.google.com/drive/folders/1QRd5kH0hL_d_2KAvFcIZfYB046_1efW9?usp=drive_link) with the person's name.
2. Make a copy of the NDA contract, rename it to "NDA - [Person's Name]", and move it to the newly created folder.
3. Replace the placeholders:

- [DATE] - with the current date in a format 20 September, 2021
- [NAME] - with the person's full name
- [IDENTIFICATION] - with the person's passport number (or other official ID number)
- [ROLE] - with the person's role in the company
- [EMAIL] - with the person's email

This requires a development of the whole functionality of working with Google Drive, OAuth, or (maybe we can use some API key - need to research it. We are already using some API key for gemini, so maybe it is similar and can be used instead of OAuth, as it is much more complex).

At this stage we have the NDA contract. This can be a single tool call, in my opinion. The master agent, when using this tool, should generate temporary pdf, send it to the chat, and send the edit link to the created file on the google docs in case user wants to edit manually. Only then, after user explicitly approves the generated contract, we can continue with signing.

NOTE: Additionally you can refer to /Users/elumixor/dev/spring/src/integrations/google and overall to /Users/elumixor/dev/spring/ to see how it was implemented in the previous project. It is somewhat complicated - using OAuth and dynamic databases, which we might not need. But working with google drive and docs is something we can probably use and adapt to or needs.

## Signature of documents

For this we need to also create dedicated tool. We will use the DigiSigner. Here's tutorial/documentation: https://www.digisigner.com/esignature-api/esignature-api-documentation/#send_signature_request

In short, we should start with downloading the pdf (we can use the attachment from the telegram message) - probably need to add a tool DownloadFile(url) for this, which will store it in the temp folder and return a path to the file.

Then we need to analyze it and place fields for signing. Again, refer to the spring codebase, somewhere in: /Users/elumixor/dev/spring/src/integrations/dropbox-sign/box-estimation.ts and /Users/elumixor/dev/spring/src/integrations/dropbox-sign/extractor.ts. That codebase is for Dropbox Sign, but the logic of analyzing the document and placing fields should be similar. We can probably adapt some of the code from there.

Finally, we should send the document for signing, with the correct data. We should probably get a link for signing for both parties, which we should share back to the user in the telegram chat. It should look something like this:

> NDA - [Person's Name] is ready for signing: [link](link)

I think this request should return some sign id, sign url. And we should store this in the Notion (SensitiveData database). In notion we can then store a link to the signed document.

Alternatively, we can use the “Signature Request Completed” callback URL (from documentation, but we will do this later, as it requires setting up a server to receive the callback) to automatically update the Notion database once the document is signed.
