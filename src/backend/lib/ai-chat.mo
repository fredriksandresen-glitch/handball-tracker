import Array "mo:core/Array";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/ai-chat";

module {
  let MAX_QUESTION_LENGTH = 1_000;
  let MAX_THREADS_PER_USER = 25;
  let MAX_DAILY_QUESTIONS = 40;
  let MAX_CONVERSATION_MESSAGES = 12;
  let DAY_NS : Int = 86_400_000_000_000;
  let STALE_JOB_NS : Int = 300_000_000_000;

  public type State = {
    var threads : List.List<Types.Thread>;
    var messages : List.List<Types.Message>;
    var jobs : List.List<Types.Job>;
    var workerPrincipal : ?Principal;
    var nextThreadId : Nat;
    var nextMessageId : Nat;
    var nextJobId : Nat;
  };

  public func requireAuthenticated(caller : Principal) {
    if (caller.isAnonymous()) Runtime.trap("Authentication required");
  };

  public func requireController(caller : Principal) {
    if (not caller.isController()) Runtime.trap("Controller access required");
  };

  public func requireWorker(state : State, caller : Principal) {
    switch (state.workerPrincipal) {
      case (?worker) {
        if (worker != caller) Runtime.trap("AI worker access required");
      };
      case null Runtime.trap("AI worker is not configured");
    };
  };

  func publicThread(thread : Types.Thread) : Types.PublicThread = {
    id = thread.id;
    title = thread.title;
    createdAt = thread.createdAt;
    updatedAt = thread.updatedAt;
  };

  func publicMessage(message : Types.Message) : Types.PublicMessage = {
    id = message.id;
    threadId = message.threadId;
    role = message.role;
    content = message.content;
    createdAt = message.createdAt;
    status = message.status;
    answerStatus = message.answerStatus;
    generatedByAi = message.generatedByAi;
    evidence = message.evidence;
    sources = message.sources;
    missingData = message.missingData;
    followUpQuestions = message.followUpQuestions;
  };

  func publicJob(job : Types.Job) : Types.PublicJob = {
    id = job.id;
    threadId = job.threadId;
    status = job.status;
    createdAt = job.createdAt;
    updatedAt = job.updatedAt;
    error = job.error;
  };

  func findOwnedThread(state : State, caller : Principal, threadId : Nat) : Types.Thread {
    switch (state.threads.find(func(thread) { thread.id == threadId and thread.owner == caller })) {
      case (?thread) thread;
      case null Runtime.trap("Chat thread not found");
    };
  };

  func updateThreadTimestamp(state : State, threadId : Nat, now : Int) {
    state.threads.forEachEntry(func(index, thread) {
      if (thread.id == threadId) {
        state.threads.put(index, { thread with updatedAt = now });
      };
    });
  };

  func createThreadInternal(state : State, caller : Principal, title : Text, now : Int) : Types.Thread {
    let userThreadCount = state.threads.toArray().filter(func(thread) { thread.owner == caller }).size();
    if (userThreadCount >= MAX_THREADS_PER_USER) {
      Runtime.trap("Chat thread limit reached");
    };

    let thread : Types.Thread = {
      id = state.nextThreadId;
      owner = caller;
      title;
      createdAt = now;
      updatedAt = now;
    };
    state.nextThreadId += 1;
    state.threads.add(thread);
    thread;
  };

  public func createThread(state : State, caller : Principal, title : Text) : Types.PublicThread {
    requireAuthenticated(caller);
    publicThread(createThreadInternal(state, caller, title, Time.now()));
  };

  public func getMyThreads(state : State, caller : Principal) : [Types.PublicThread] {
    requireAuthenticated(caller);
    let threads = state.threads.toArray()
      .filter(func(thread) { thread.owner == caller })
      .map(publicThread);
    threads.sort(func(a, b) {
      if (a.updatedAt > b.updatedAt) #less
      else if (a.updatedAt < b.updatedAt) #greater
      else #equal
    });
  };

  public func getMyMessages(state : State, caller : Principal, threadId : Nat) : [Types.PublicMessage] {
    requireAuthenticated(caller);
    ignore findOwnedThread(state, caller, threadId);
    state.messages.toArray()
      .filter(func(message) { message.owner == caller and message.threadId == threadId })
      .map(publicMessage);
  };

  public func getMyJob(state : State, caller : Principal, jobId : Nat) : ?Types.PublicJob {
    requireAuthenticated(caller);
    switch (state.jobs.find(func(job) { job.id == jobId and job.owner == caller })) {
      case (?job) ?publicJob(job);
      case null null;
    };
  };

  public func getMyActiveJob(state : State, caller : Principal, threadId : Nat) : ?Types.PublicJob {
    requireAuthenticated(caller);
    ignore findOwnedThread(state, caller, threadId);
    switch (state.jobs.find(func(job) {
      job.threadId == threadId and job.owner == caller and
      (job.status == #pending or job.status == #processing)
    })) {
      case (?job) ?publicJob(job);
      case null null;
    };
  };

  public func deleteMyThread(state : State, caller : Principal, threadId : Nat) {
    requireAuthenticated(caller);
    ignore findOwnedThread(state, caller, threadId);
    switch (state.jobs.find(func(job) {
      job.threadId == threadId and job.owner == caller and
      (job.status == #pending or job.status == #processing)
    })) {
      case (?_) Runtime.trap("Cannot delete a chat while analysis is running");
      case null {};
    };
    state.threads := state.threads.filter(func(thread) { thread.id != threadId or thread.owner != caller });
    state.messages := state.messages.filter(func(message) { message.threadId != threadId or message.owner != caller });
    state.jobs := state.jobs.filter(func(job) { job.threadId != threadId or job.owner != caller });
  };

  public func submitQuestion(
    state : State,
    caller : Principal,
    threadId : ?Nat,
    question : Text,
    context : Types.Context,
  ) : Types.SubmitResult {
    requireAuthenticated(caller);
    switch (state.workerPrincipal) {
      case null Runtime.trap("AI worker is not configured");
      case (?_) {};
    };
    if (question.size() == 0 or question.size() > MAX_QUESTION_LENGTH) {
      Runtime.trap("Question must contain between 1 and 1000 characters");
    };

    let now = Time.now();
    switch (threadId) {
      case (?id) {
        switch (state.jobs.find(func(job) {
          job.threadId == id and job.owner == caller and
          (job.status == #pending or job.status == #processing)
        })) {
          case (?_) Runtime.trap("Wait for the current analysis to finish");
          case null {};
        };
      };
      case null {};
    };
    let recentQuestionCount = state.jobs.toArray().filter(func(job) {
      job.owner == caller and job.createdAt >= now - DAY_NS
    }).size();
    if (recentQuestionCount >= MAX_DAILY_QUESTIONS) {
      Runtime.trap("Daily AI question limit reached");
    };

    let thread = switch (threadId) {
      case (?id) findOwnedThread(state, caller, id);
      case null createThreadInternal(state, caller, question, now);
    };

    let userMessage : Types.Message = {
      id = state.nextMessageId;
      threadId = thread.id;
      owner = caller;
      role = #user;
      content = question;
      createdAt = now;
      status = #complete;
      answerStatus = null;
      generatedByAi = false;
      evidence = [];
      sources = [];
      missingData = [];
      followUpQuestions = [];
    };
    state.nextMessageId += 1;
    state.messages.add(userMessage);

    let job : Types.Job = {
      id = state.nextJobId;
      threadId = thread.id;
      userMessageId = userMessage.id;
      owner = caller;
      question;
      context;
      status = #pending;
      createdAt = now;
      updatedAt = now;
      attempts = 0;
      error = null;
    };
    state.nextJobId += 1;
    state.jobs.add(job);
    updateThreadTimestamp(state, thread.id, now);

    {
      threadId = thread.id;
      jobId = job.id;
      userMessageId = userMessage.id;
    };
  };

  func conversationForJob(state : State, job : Types.Job) : [Types.ConversationMessage] {
    let messages = state.messages.toArray().filter(func(message) {
      message.threadId == job.threadId and message.owner == job.owner and message.id != job.userMessageId
    });
    let start = if (messages.size() > MAX_CONVERSATION_MESSAGES) {
      messages.size() - MAX_CONVERSATION_MESSAGES
    } else 0;
    Array.tabulate<Types.ConversationMessage>(messages.size() - start, func(index) {
      let message = messages[start + index];
      { role = message.role; content = message.content };
    });
  };

  public func claimNextJob(state : State, caller : Principal) : ?Types.WorkItem {
    requireWorker(state, caller);
    let now = Time.now();
    var claimed : ?Types.WorkItem = null;
    var didClaim = false;

    state.jobs.forEachEntry(func(index, job) {
      if (not didClaim) {
        let claimable = switch (job.status) {
          case (#pending) true;
          case (#processing) job.updatedAt < now - STALE_JOB_NS;
          case _ false;
        };
        if (claimable) {
          let updated = {
            job with
            status = #processing;
            updatedAt = now;
            attempts = job.attempts + 1;
            error = null;
          };
          state.jobs.put(index, updated);
          didClaim := true;
          claimed := ?{
            id = updated.id;
            threadId = updated.threadId;
            owner = updated.owner;
            question = updated.question;
            context = updated.context;
            conversation = conversationForJob(state, updated);
            attempts = updated.attempts;
          };
        };
      };
    });
    claimed;
  };

  public func completeJob(state : State, caller : Principal, jobId : Nat, completion : Types.Completion) {
    requireWorker(state, caller);
    if (completion.answer.size() == 0 or completion.answer.size() > 20_000) {
      Runtime.trap("AI answer must contain between 1 and 20000 characters");
    };

    let now = Time.now();
    var completedJob : ?Types.Job = null;
    state.jobs.forEachEntry(func(index, job) {
      if (job.id == jobId and job.status == #processing) {
        let updated = { job with status = #complete; updatedAt = now; error = null };
        state.jobs.put(index, updated);
        completedJob := ?updated;
      };
    });

    switch (completedJob) {
      case null Runtime.trap("Processing AI job not found");
      case (?job) {
        let message : Types.Message = {
          id = state.nextMessageId;
          threadId = job.threadId;
          owner = job.owner;
          role = #assistant;
          content = completion.answer;
          createdAt = now;
          status = #complete;
          answerStatus = ?completion.answerStatus;
          generatedByAi = completion.generatedByAi;
          evidence = completion.evidence;
          sources = completion.sources;
          missingData = completion.missingData;
          followUpQuestions = completion.followUpQuestions;
        };
        state.nextMessageId += 1;
        state.messages.add(message);
        updateThreadTimestamp(state, job.threadId, now);
      };
    };
  };

  public func failJob(state : State, caller : Principal, jobId : Nat, error : Text) {
    requireWorker(state, caller);
    let now = Time.now();
    var failedJob : ?Types.Job = null;
    state.jobs.forEachEntry(func(index, job) {
      if (job.id == jobId and job.status == #processing) {
        let updated = { job with status = #failed; updatedAt = now; error = ?error };
        state.jobs.put(index, updated);
        failedJob := ?updated;
      };
    });

    switch (failedJob) {
      case null Runtime.trap("Processing AI job not found");
      case (?job) {
        let message : Types.Message = {
          id = state.nextMessageId;
          threadId = job.threadId;
          owner = job.owner;
          role = #assistant;
          content = "Analysen kunne ikke fullføres. Prøv igjen senere.";
          createdAt = now;
          status = #failed;
          answerStatus = null;
          generatedByAi = false;
          evidence = [];
          sources = [];
          missingData = [];
          followUpQuestions = [];
        };
        state.nextMessageId += 1;
        state.messages.add(message);
        updateThreadTimestamp(state, job.threadId, now);
      };
    };
  };

  public func configureWorker(state : State, caller : Principal, worker : Principal) {
    requireController(caller);
    if (worker.isAnonymous()) Runtime.trap("Worker principal cannot be anonymous");
    state.workerPrincipal := ?worker;
  };

  public func workerStatus(state : State) : Types.WorkerStatus {
    let jobs = state.jobs.toArray();
    {
      configured = switch (state.workerPrincipal) {
        case (?_) true;
        case null false;
      };
      pendingJobs = jobs.filter(func(job) { job.status == #pending }).size();
      processingJobs = jobs.filter(func(job) { job.status == #processing }).size();
    };
  };
};
