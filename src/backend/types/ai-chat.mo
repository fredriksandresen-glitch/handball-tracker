import Principal "mo:core/Principal";

module {
  public type Role = { #user; #assistant };
  public type MessageStatus = { #complete; #failed };
  public type AnswerStatus = { #answered; #insufficientData };
  public type JobStatus = { #pending; #processing; #complete; #failed };

  public type Context = {
    season : Text;
    league : Text;
    route : Text;
    playerIds : [Text];
    teamIds : [Text];
  };

  public type Evidence = {
    title : Text;
    value : Text;
    unit : ?Text;
    playerId : ?Text;
    teamId : ?Text;
    matchId : ?Text;
  };

  public type Source = {
    title : Text;
    method : Text;
    entityIds : [Text];
    observedAt : ?Text;
  };

  public type Message = {
    id : Nat;
    threadId : Nat;
    owner : Principal;
    role : Role;
    content : Text;
    createdAt : Int;
    status : MessageStatus;
    answerStatus : ?AnswerStatus;
    generatedByAi : Bool;
    evidence : [Evidence];
    sources : [Source];
    missingData : [Text];
    followUpQuestions : [Text];
  };

  public type PublicMessage = {
    id : Nat;
    threadId : Nat;
    role : Role;
    content : Text;
    createdAt : Int;
    status : MessageStatus;
    answerStatus : ?AnswerStatus;
    generatedByAi : Bool;
    evidence : [Evidence];
    sources : [Source];
    missingData : [Text];
    followUpQuestions : [Text];
  };

  public type Thread = {
    id : Nat;
    owner : Principal;
    title : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type PublicThread = {
    id : Nat;
    title : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type Job = {
    id : Nat;
    threadId : Nat;
    userMessageId : Nat;
    owner : Principal;
    question : Text;
    context : Context;
    status : JobStatus;
    createdAt : Int;
    updatedAt : Int;
    attempts : Nat;
    error : ?Text;
  };

  public type PublicJob = {
    id : Nat;
    threadId : Nat;
    status : JobStatus;
    createdAt : Int;
    updatedAt : Int;
    error : ?Text;
  };

  public type ConversationMessage = {
    role : Role;
    content : Text;
  };

  public type WorkItem = {
    id : Nat;
    threadId : Nat;
    owner : Principal;
    question : Text;
    context : Context;
    conversation : [ConversationMessage];
    attempts : Nat;
  };

  public type SubmitResult = {
    threadId : Nat;
    jobId : Nat;
    userMessageId : Nat;
  };

  public type Completion = {
    answer : Text;
    answerStatus : AnswerStatus;
    generatedByAi : Bool;
    evidence : [Evidence];
    sources : [Source];
    missingData : [Text];
    followUpQuestions : [Text];
  };

  public type WorkerStatus = {
    configured : Bool;
    pendingJobs : Nat;
    processingJobs : Nat;
  };
};
