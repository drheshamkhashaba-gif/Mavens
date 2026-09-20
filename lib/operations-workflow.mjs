const allowed={
 awaiting_arrival:["check_in"],
 checked_in:["record_consent"],
 consented:["send_to_imaging"],
 imaging:["complete_imaging"],
 ready_for_doctor:["notify_doctor"],
};

export function receptionStep({status,consentStatus,action}){
 const effective=status==="checked_in"&&consentStatus==="signed"?"consented":status;
 if(!allowed[effective]?.includes(action)) throw new Error(`INVALID_RECEPTION_STEP:${effective}:${action}`);
 return {check_in:"checked_in",record_consent:"checked_in",send_to_imaging:"imaging",complete_imaging:"ready_for_doctor",notify_doctor:"doctor_notified"}[action];
}

export function hasScheduleConflict(appointments,{appointmentId,startsAt,providerId,deviceId,roomId}){
 return appointments.some(a=>a.id!==appointmentId&&a.startsAt===startsAt&&a.status!=="cancelled"&&((providerId&&a.providerId===providerId)||(deviceId&&a.deviceId===deviceId)||(roomId&&a.roomId===roomId)));
}
