
let obj1 = {
    name: "Saket",
    convo: [123,456,789]
}

let obj2 = {
    name: "Shreyas",
    convo: [1233,4563,7893]
}

let obj3 = {
    name: "Rahul",
    convo: [12344,45644,78944]
}

let user = {
    name: "Rohan",
    contact: [obj1,obj2,obj3]
}

let arr = user.contact.filter((a) => a.name==="Rahul");
let convo = arr[0].convo.filter((a) => a!== 12344);
user.contact.forEach(contact => {
    if(contact.name === "Rahul") {
        contact.convo = convo;
    }
});

console.log(user.contact, obj3);