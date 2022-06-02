function validateForm(){
    console.log('comprobar formulario') 
    if (document.getElementById('name').value != '' &&
        document.getElementById('email').value != '' &&
        document.getElementById('password').value != '' ){
         
            if(document.getElementById('password').value  != document.getElementById('password2').value){
            alert('Las contraseñas no coinciden!')
            return false
         }
    return true
    
    }else{
        alert('Requisito obligatorio')
        return false
    }
}