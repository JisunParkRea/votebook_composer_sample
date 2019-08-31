/**
 * create new voter
 * @param {org.example.votebook.CreateVoterToken} createInfo
 * @transaction
*/
async function createVoterToken(createInfo) {
  try {
    let voterInfo = createInfo.voterInfo;
    let voterRegistry = await getParticipantRegistry('org.example.votebook.Voter');
    let voter = await getFactory().newResource('org.example.votebook', 'Voter', voterInfo.voterId);
    
    let tokenInfo = createInfo.tokenInfo;
    let tokenRegistry = await getAssetRegistry('org.example.votebook.Token');
    let token = await getFactory().newResource('org.example.votebook', 'Token', tokenInfo.tokenId);

    voter.studentId = voterInfo.studentId;
    voter.name = voterInfo.name;
    voter.department = voterInfo.department;
    voter.token = voterInfo.token;
    
    token.tokenId = tokenInfo.tokenId;    
    
    await voterRegistry.add(voter);
    await tokenRegistry.add(token);
  } catch(exception) {
    let event = getFactory().newEvent('org.example.votebook', 'ErrorReport');
    event.errorType = "Cannot create new voter and token";
    emit(event);
    return;
  }
}

/**
 * Approve the request of making token valid
 * if the department of voter is CSE
 * @param {org.example.votebook.RequestTokenValid} request
 * @transaction
*/
async function approveTokenValid(request) {
  let event = getFactory().newEvent('org.example.votebook', 'ErrorReport');
  try {
    let voterInfo = request.voter;
    if(voterInfo.department == "CSE" && voterInfo.token.isExpired == false){
      voterInfo.token.isValid = true;
      let tokenRegistry = await getAssetRegistry('org.example.votebook.Token');
      tokenRegistry.update(voterInfo.token);
    } else {
    event.errorType = "Request denied : Not in CSE or token expired";
    emit(event);
    return;
    }
  } catch(exception) {
    event.errorType = "Request denied : Cannot validate the token";
    emit(event);
    return;
  }
}

/**
 * Enroll new candidate
 * if candidate is in CSE and valid voter
 * @param {org.example.votebook.EnrollCandidate} candidateEnroll
 * @transaction
*/
async function enrollCandidate(candidateEnroll) {
  let event = getFactory().newEvent('org.example.votebook', 'ErrorReport');
  try {
    let candidateInfo = candidateEnroll.candidate;
    let candidateRegistry = await getAssetRegistry('org.example.votebook.Candidate');
    let candidate = await getFactory().newResource('org.example.votebook', 'Candidate', candidateInfo.candidateId);
    
    if(candidateInfo.voter.department != "CSE" || candidateInfo.voter.token.isValid == false){
      event.errorType = "Not in CSE or valid voter";
      emit(event);
      return;
    }
    
    candidate.voter = candidateInfo.voter;
    return candidateRegistry.add(candidate);
  } catch(exception) {
    event.errorType = "Cannot create new candidate";
    emit(event);
    return;
  }
}

/**
 * voting
 * @param {org.example.votebook.Vote} voting
 * @transaction
*/
async function vote(voting) {
  let event = getFactory().newEvent('org.example.votebook', 'ErrorReport');
  try {
    let tokenInfo = voting.token;
    if(tokenInfo.isValid == false || tokenInfo.isExpired == true){
      event.errorType = "Voting denied : you are not valid voter";
      emit(event);
      return;
    }
    
    let tokenRegistry = await getAssetRegistry('org.example.votebook.Token');
    let token = await getFactory().newResource('org.example.votebook', 'Token', tokenInfo.tokenId);
    
    let candidateInfo = voting.candidateSelect;
    let candidateRegistry = await getAssetRegistry('org.example.votebook.Candidate');
    let candidate = await getFactory().newResource('org.example.votebook', 'Candidate', candidateInfo.candidateId);
   
    candidate.voter = candidateInfo.voter;
    let getCandidateInfo = await candidateRegistry.get(candidateInfo.candidateId);
    candidate.voteNum = getCandidateInfo.voteNum + 1;
    token.isExpired = true;
    
    await tokenRegistry.update(token);
    await candidateRegistry.update(candidate); 
  } catch(exception) {
    event.errorType = "Voting denied";
    emit(event);
    return;
  }
}