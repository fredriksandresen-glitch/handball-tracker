import Principal "mo:core/Principal";

module {
  /**
   * Rollestyrt tilgang (F11).
   *
   * supporter = alle. Ingen maa registreres for aa bruke appen.
   * trener    = arbeidsverktoey for ETT lag (teamId).
   * admin     = alt treneren ser, pluss tildeling av roller.
   */
  public type Role = { #supporter; #trener; #admin };

  public type Assignment = {
    subject : Principal;
    role : Role;
    /** Trener er trener for ett lag, ikke for hele ligaen. */
    teamId : ?Nat;
    assignedBy : Principal;
    assignedAt : Int;
  };

  /** Revisjonslogg: hvem ga hvem tilgang, naar. Kan ikke endres i ettertid. */
  public type AuditEntry = {
    id : Nat;
    changedBy : Principal;
    subject : Principal;
    previousRole : ?Role;
    newRole : Role;
    teamId : ?Nat;
    at : Int;
  };
}
