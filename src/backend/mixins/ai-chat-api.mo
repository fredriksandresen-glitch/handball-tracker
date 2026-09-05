import Principal "mo:core/Principal";
import AiChatLib "../lib/ai-chat";
import Types "../types/ai-chat";

mixin (state : AiChatLib.State, reportState : AiChatLib.ReportState) {
  public shared ({ caller }) func createAiThread(title : Text) : async Types.PublicThread {
    AiChatLib.createThread(state, caller, title);
  };

  public query ({ caller }) func getMyAiThreads() : async [Types.PublicThread] {
    AiChatLib.getMyThreads(state, caller);
  };

  public query ({ caller }) func getMyAiMessages(threadId : Nat) : async [Types.PublicMessage] {
    AiChatLib.getMyMessages(state, caller, threadId);
  };

  public query ({ caller }) func getMyAiReports(threadId : Nat) : async [Types.ReportMetadata] {
    AiChatLib.getMyReports(state, reportState, caller, threadId);
  };

  public query ({ caller }) func getMyAiReport(reportId : Nat) : async ?Types.PublicReport {
    AiChatLib.getMyReport(reportState, caller, reportId);
  };

  public query ({ caller }) func getMyAiJob(jobId : Nat) : async ?Types.PublicJob {
    AiChatLib.getMyJob(state, caller, jobId);
  };

  public query ({ caller }) func getMyActiveAiJob(threadId : Nat) : async ?Types.PublicJob {
    AiChatLib.getMyActiveJob(state, caller, threadId);
  };

  public shared ({ caller }) func deleteMyAiThread(threadId : Nat) : async () {
    AiChatLib.deleteMyThread(state, reportState, caller, threadId);
  };

  public shared ({ caller }) func submitAiQuestion(
    threadId : ?Nat,
    question : Text,
    context : Types.Context,
  ) : async Types.SubmitResult {
    AiChatLib.submitQuestion(state, caller, threadId, question, context);
  };

  public shared ({ caller }) func claimNextAiJob() : async ?Types.WorkItem {
    AiChatLib.claimNextJob(state, caller);
  };

  public shared ({ caller }) func completeAiJob(jobId : Nat, completion : Types.Completion) : async () {
    AiChatLib.completeJob(state, reportState, caller, jobId, completion);
  };

  public shared ({ caller }) func failAiJob(jobId : Nat, error : Text) : async () {
    AiChatLib.failJob(state, caller, jobId, error);
  };

  public shared ({ caller }) func configureAiWorker(worker : Principal) : async () {
    AiChatLib.configureWorker(state, caller, worker);
  };

  public query func getAiWorkerStatus() : async Types.WorkerStatus {
    AiChatLib.workerStatus(state);
  };
};
