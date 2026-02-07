export interface Offense {
  number: string;
  title: string;
  items?: string[];
  sanctions: {
    first: string;
    second: string;
    third: string;
  };
}

export const majorOffenses: Offense[] = [
  {
    number: "1",
    title: "Liquor and Prohibited Drugs",
    items: [
      "Entering the university under the influence of drugs or liquor",
      "Possessing or using intoxicating liquor or its form anywhere in the University premises unless otherwise related to instruction, research, extension and production activities as authorized by the University authorities",
      "Selling or intoxicating liquor in any form within the University premises",
      "Possessing, using or taking of prohibited drugs/chemicals regardless of value or volume",
      "Selling of prohibited drugs/chemicals regardless of value or volume"
    ],
    sanctions: {
      first: "Suspension up to 1 semester",
      second: "Suspension up to 1-3 days / Suspension up to 30 school days / Dismissal",
      third: "Suspension for one semester / Dismissal / Expulsion"
    }
  },
  {
    number: "2",
    title: "Unauthorized Activities/Illegal Assemblies",
    items: [
      "Organizing, leading, instigating or joining rallies, demonstrations or other forms of unapproved group actions that cause disorder or chaos in the University, or tarnish its name or that of its constituents",
      "Joining, distributing, disseminating or posting propaganda that promotes sedition or rebellion",
      "Organizing, asking, or information that requires or allows a student, parent or any person to join any fraternity, sorority or student organization that is not authorized, recognized or accredited by the University",
      "Hazing, or inflicting physical, psychological, emotional or mental harm, suffering or injury on any person who intends to join any fraternity, sorority or any student organization that is not recognized or accredited by the University, or conducting initiation rites, in any form or manner, as requirement for admission to any such organization"
    ],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "3",
    title: "Deadly and Dangerous Weapons",
    items: [
      "Possessing guns, firearms, ammunitions, explosives, incendiary devices or detonation agents and bringing them to the University premises or during the occasion of any official school activity",
      "Possessing sharp, pointed, bladed or blunt weapons and bringing them to the University premises or to any official school activity unless such weapons are used for legal purposes"
    ],
    sanctions: {
      first: "Suspension for one semester / Suspension up to 30 school days",
      second: "Dismissal/Expulsion / Suspension for one semester",
      third: "Dismissal"
    }
  },
  {
    number: "4",
    title: "Threats/Coercion",
    items: [
      "Threatening or inflicting any wrong upon a person's honor or property unless the latter gives money or property or performs any condition imposed upon him",
      "Coercing a person to do something against his will or engaging him into doing something that is unlawful unless he gives money property, or performs any condition imposed upon him"
    ],
    sanctions: {
      first: "Suspension up to 30 school days and restitution of the amount of property, if any",
      second: "Suspension for one semester and restitution of the amount or property, if any",
      third: "Dismissal and restitution of the amount or property, if any"
    }
  },
  {
    number: "5",
    title: "Swindling",
    items: [
      "Obtaining money or property from any person, group, or organization using false pretenses, fraudulent acts or fraud"
    ],
    sanctions: {
      first: "Suspension up to 30 school days and restitution of the amount or property, if any",
      second: "Suspension for one semester and restitution of the amount or property, if any",
      third: "Dismissal and restitution of the amount or property, if any"
    }
  },
  {
    number: "6",
    title: "Misuse of/Failure to Account Funds",
    items: [
      "Unauthorized use of funds of any person, group, class, organization/student government",
      "Failure to account for the appropriated funds"
    ],
    sanctions: {
      first: "Suspension up to 30 school days and restitution of the funds, if any",
      second: "Suspension for one semester and restitution of the funds, if any",
      third: "Dismissal and restitution of the funds, if any"
    }
  },
  {
    number: "7",
    title: "Violence and Physical Assault/Injury",
    items: [
      "Acts of violence resulting to physical harm or injury, thereby needing medical attention/hospitalization; incapacitating any person",
      "Unwanted and intentional aggression, taking the form of either physical or verbal assault, or both, whether written, verbal or electronic, eliciting shame, fear, embarrassment, intimidation or anxiety to the target/victim or leading to his psychological trauma",
      "Acts of violence resulting to permanent disability or death"
    ],
    sanctions: {
      first: "Suspension for one semester / Suspension for one semester / Expulsion",
      second: "Dismissal / Dismissal",
      third: ""
    }
  },
  {
    number: "8",
    title: "Robbery/Theft",
    items: [
      "Taking of property, documents or records belonging to another person without consent, by means of violence or intimidation with intent to gain money"
    ],
    sanctions: {
      first: "Suspension up to 30 school days and replacement of the stolen item",
      second: "Suspension for one semester and replacement of the stolen item",
      third: "Dismissal and replacement of the stolen item"
    }
  },
  {
    number: "9",
    title: "Damage to Property",
    items: [
      "Intentionally causing damage to any University property or other properties within the University premises by burning or with the use of explosives or improvised explosive devices",
      "Intentionally causing damage to any University property or other properties within the University premises by burning or with the use of explosives or improvised explosive devices"
    ],
    sanctions: {
      first: "Suspension up to 30 days, repair/replacement of damaged property / Expulsion",
      second: "Suspension for one semester, repair/replacement of damaged property",
      third: "Dismissal"
    }
  },
  {
    number: "10",
    title: "Forcible or unauthorized entry into TUP premises",
    items: [],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "11",
    title: "Commission of cyber crimes as defined under R.A. No. 10175",
    items: [],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "12",
    title: "Slander/Libel/Gossip",
    items: [
      "Oral Defamation",
      "Slander by deed",
      "Public and malicious imputation of a crime, vice or defect, real or imaginary, or any act, omission, condition, status or circumstance tending to cause dishonor, discredit or contempt of any member of the TUP community"
    ],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days / Suspension up to 30 school days / Suspension for one semester",
      third: "Suspension for one semester / Suspension for one semester / Dismissal"
    }
  },
  {
    number: "13",
    title: "Falsification of documents, records and credentials",
    items: [
      "Forging, falsifying or tampering with University records, data, documents, identification cards or credentials, or knowingly furnishing the University with false or fraudulent information in connection with any official document, activity or transaction"
    ],
    sanctions: {
      first: "Suspension for one semester",
      second: "Dismissal",
      third: ""
    }
  },
  {
    number: "14",
    title: "Academic Dishonesty",
    items: [
      "Cheating during examinations",
      "Cheating in any form: assignments, research papers, or projects",
      "Stealing of examination papers or answer keys",
      "Selling of examination papers or answer keys",
      "Plagiarism"
    ],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days / Dismissal",
      third: "Suspension for one semester"
    }
  },
  {
    number: "15",
    title: "Immoral Acts",
    items: [
      "Publishing, possessing, viewing, reading, displaying, selling or distribution of pornographic and immoral materials within the school premises",
      "Engaging in immoral or scandalous conduct in any activity within the University premises",
      "Conducting an illicit affair with any member of the TUP Community",
      "Committing sexual harassment committed by a student against another student"
    ],
    sanctions: {
      first: "Suspension up to 15 school days / Suspension up to 15 school days / Suspension up to 15 school days with forfeiture of Love Gift / Suspension up to 30 school days",
      second: "Suspension up to 30 school days / Suspension up to 30 school days / Suspension up to 30 school days / Suspension for one semester",
      third: "Suspension for one semester / Suspension for one semester / Suspension for one semester / Dismissal"
    }
  },
  {
    number: "16",
    title: "Gambling",
    items: [
      "Engaging in any form of gambling within the University premises"
    ],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "17",
    title: "False representation or Misrepresentation",
    items: [
      "Representing the University in any local/national/international affair without any approval from the duly authorized officials of the University",
      "Sale of tickets/involvement in a promotional fund raising campaign in the name of TUP, a TUP organization without the official approval of the Campus Director/Director of the Office of Student Affairs or his duly authorized representative",
      "Entering into any contract or financial transaction with any outside person, firm, entity or organization in the name of the University without any approval from a duly authorized official"
    ],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "18",
    title: "Acts of Disrespect",
    items: [
      "Disrespect towards the national flag, national anthem, or other national symbols",
      "Disrespect towards the University flag, hymn, or any or all its symbols",
      "Disrespect towards faculty members, non-academic officials of the University, or any other person in authority by ridiculing, mocking, instigating a quarrel or making sexual advances"
    ],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "19",
    title: "Offering or Giving Bribes",
    items: [
      "Offering or giving anything of value to any person in authority contrary to law, morals, good customs and public policy, including falsifying the attendance record of the NSTP, PE or any required activity"
    ],
    sanctions: {
      first: "Suspension up to 30 school days",
      second: "Suspension for one semester",
      third: "Dismissal"
    }
  },
  {
    number: "20",
    title: "Smoking within the University premises of any type of cigarette or tobacco product",
    items: [],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "21",
    title: "Littering within the University premises",
    items: [],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "22",
    title: "Entering the University premises without Authorized ID/registration form",
    items: [],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "23",
    title: "Lending of ID/registration form to facilitate the entry of another student into the University premises",
    items: [],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "24",
    title: "Commission of the same or any minor offense for the third time",
    items: [],
    sanctions: {
      first: "Suspension up to 15 school days",
      second: "Suspension up to 30 school days",
      third: "Suspension for one semester"
    }
  },
  {
    number: "25",
    title: "Commission of a major offense while under academic probation",
    items: [],
    sanctions: {
      first: "Dismissal/Expulsion",
      second: "",
      third: ""
    }
  },
  {
    number: "26",
    title: "Final conviction of any offense punishable under the Revised Penal Code, special penal laws or ordinances",
    items: [],
    sanctions: {
      first: "Dismissal",
      second: "",
      third: ""
    }
  }
];

export const minorOffenses: Offense[] = [
  {
    number: "1",
    title: "Loitering or causing disturbance during class hours",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "2",
    title: "Not wearing the prescribed uniform/haircut/University identification card while inside the University premises",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "3",
    title: "Cross dressing during uniform days and wash days",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "4",
    title: "Violation of the dress code regulation or the footwear regulation during wash days",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "5",
    title: "For male students, sporting of inappropriate or unwanted facial hair, as may be determined by the proper University officials",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "6",
    title: "Wearing earrings for male students and multiple earrings for female students within the University premises or during school activities",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "7",
    title: "Wearing caps or hats inside the classrooms or covered facilities",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "8",
    title: "Entering the classroom (students from other classes) without permission from the instructor while the class is going on",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "9",
    title: "Leaving the room without permission (cutting classes) from the instructor while the class is on going",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "10",
    title: "Attempting to join any fraternity, sorority or student organization that is not recognized or accredited by the University",
    items: [
      "A attempt to attempt when a student has signed an application form to join a fraternity, a sorority or any unaccredited organization"
    ],
    sanctions: {
      first: "Warning and a Letter of Apology with the undertaking that the student will not attempt to join said organization",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "11",
    title: "Posting printed materials in the University premises without prior written approval from the proper University officials",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "12",
    title: "Using the University facilities without prior written permission from the proper University officials",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "13",
    title: "Unauthorized removal of official notices and posters from the bulletin board",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "14",
    title: "Possession of gambling paraphernalia",
    items: [],
    sanctions: {
      first: "Warning, a Letter of Apology and forfeiture of gambling paraphernalia",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "15",
    title: "Unauthorized use of the cellphone, mini video/audio or other related IT gadgets/devices during classes",
    items: [],
    sanctions: {
      first: "Warning, a Letter of Apology and confiscation of the gadget. The gadget is returned after submission of the said letter of apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "16",
    title: "Irresponsible use of water and/or electricity within the University premises",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "17",
    title: "Making lewd gestures or uttering lustful word/s to offend or provoke another person or group within the campus",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "18",
    title: "Accidental damage of property within the University premises",
    items: [],
    sanctions: {
      first: "Warning, a Letter of Apology and replacement or repair of damaged property",
      second: "10 to 20 hours of community service and replacement or repair of the damaged property",
      third: "30 to 50 hours of community service and replacement or repair of damaged property"
    }
  },
  {
    number: "19",
    title: "Public and indecent display of physical intimacy with another person within the University premises or during any official school activity",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 20 hours of community service",
      third: "30 to 50 hours of community service"
    }
  },
  {
    number: "20",
    title: "Possession of any type of cigarette or tobacco product inside the campus",
    items: [],
    sanctions: {
      first: "Warning and a Letter of Apology",
      second: "10 to 50 hours of community service",
      third: "30 to 50 hours of community service"
    }
  }
];
